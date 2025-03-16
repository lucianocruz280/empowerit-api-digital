import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import { CryptoapisService } from '../cryptoapis/cryptoapis.service';
import { BinaryService } from '../binary/binary.service';
import fs from 'fs';
import { getBinaryPercent } from '../binary/binary_packs';
import {
  Bonds,
  getMentorPercent,
  getMentorPercentByRank,
} from '../bonds/bonds';
import { firestore } from 'firebase-admin';

export const ADMIN_BINARY_PERCENT = 15 / 100;
const ADMIN_QUICK_START = 30 / 100;
export const ADMIN_MENTOR_PERCENT = 30 / 100;
export const ADMIN_USERS = [
  'eN7hWGlS2mVC1O9YnXU3U5xEknz1',
  'sVarUBihvSZ7ahMUMgwaAbXcRs03',
  'vzzvaofd1GXAdgH890pGswl5A5x1',
  '9CXMbcJt2sNWG40zqWwQSxH8iki2',
  'sVarUBihvSZ7ahMUMgwaAbXcRs03'
];
export const INFINITE_POINTS = [
  'eN7hWGlS2mVC1O9YnXU3U5xEknz1',
  'sVarUBihvSZ7ahMUMgwaAbXcRs03',
  '9CXMbcJt2sNWG40zqWwQSxH8iki2',
];

@Injectable()
export class AdminService {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly binaryService: BinaryService,
  ) { }

  async getPayroll() {
    const users = await db.collection('users').get();
    const docs = users.docs.map((r) => ({ id: r.id, ...r.data() }));
    let binary_percent = 0;
    const payroll_data = docs
      .map((docData: any) => {
        // agregar matching bonus
        const hasInfinitePoints = INFINITE_POINTS.includes(docData.id);
        const binary_side = hasInfinitePoints
          ? 'right'
          : docData.left_points > docData.right_points
            ? 'right'
            : 'left';
        const binary_points = docData[`${binary_side}_points`];
        binary_percent = getBinaryPercent(docData.id, docData.membership);
        const res = {
          id: docData.id,
          name: docData.name,
          bond_direct: docData.bond_quick_start || 0,
          bond_investment: docData.bond_investment || 0,
          bond_binary: Math.floor(binary_points * binary_percent * 100) / 100,
          wallet_usdt: docData.wallet_usdt || '',
          profits: docData.profits || 0,
          sponsor_id: docData.sponsor_id || '',
          binary_percent,
          binary_side,
          binary_points,
          left_points: docData.left_points,
          right_points: docData.right_points,
          profits_this_month: docData.profits_this_month || 0,
          rank: docData.rank || 'none',
        };

        return res;
      })
      .map((doc) => ({
        ...doc,
        total: doc.bond_direct + doc.bond_investment,
      }))
      .filter((doc) => doc.total > 0)
      // sort desc
      .sort((a, b) => b.total - a.total);

    const payroll_data_2 = await Promise.all(
      payroll_data.map(async (doc) => ({
        ...doc,
        crypto_amount: doc.total,
      })),
    );

    return payroll_data_2;
  }

  async payrollCapCurrent(payroll_data: any[]) {
    /**
     * Solo cobrar el limite disponible
     * (membership_cap_limit - membership_cap_current)
     */
    const clean_data = [...payroll_data];
    for (const index in clean_data) {
      const doc = clean_data[index];
      const docRef = await db.collection('users').doc(doc.id).get();
      const membershipCapCurrent = docRef.get('membership_cap_current');
      const membershipCapLimit = docRef.get('membership_cap_limit');
      if (docRef.exists) {
        const is_new_pack = [
          '100-pack',
          '300-pack',
          '500-pack',
          '1000-pack',
          '2000-pack',
        ].includes(docRef.get('membership'));
        if (is_new_pack) {
          if (
            membershipCapCurrent + doc.bond_binary + doc.bond_mentor >
            membershipCapLimit
          ) {
            const availableAmount = membershipCapLimit - membershipCapCurrent;
            clean_data[index].total = availableAmount;
            clean_data[index].crypto_amount =
              await this.cryptoapisService.getLTCExchange(doc.total);
          }
        }
      }
    }
    return clean_data;
  }

  async payroll() {
    const payroll_data = await this.getPayroll();

    const clean_payroll_data = payroll_data
      .filter((doc) => doc.total >= 40)
      .filter((doc) => Boolean(doc.wallet_usdt));

    const ref = await db.collection('payroll').add({
      ...clean_payroll_data,
      total_usd: clean_payroll_data.reduce((a, b) => a + b.total, 0),
      created_at: new Date(),
    });
    await Promise.all(
      clean_payroll_data.map(async (doc) => {
        await ref.collection('details').add(doc);
        await db.collection(`users/${doc.id}/payroll`).add({
          ...doc,
          created_at: new Date(),
        });
      }),
    );

    for (const doc of clean_payroll_data) {
      await db
        .collection('users')
        .doc(doc.id)
        .update({
          profits: doc.profits + doc.total,
          bond_quick_start: 0,
          bond_investment: 0,
        });
    }

    /** TODO: sendRequestTransaction */

    return clean_payroll_data;
  }

  /**
   * Enviar transacción a cryptoapis usando un registro de payroll
   */
  async payrollFromPayroll(id: string, blockchain: Blockchains) {
    const payroll_data = await db
      .collection('payroll')
      .doc(id)
      .collection('details')
      .get();

    if (['bitcoin', 'litecoin'].includes(blockchain)) {
      const wallet =
        blockchain == 'bitcoin' ? 'wallet_bitcoin' : 'wallet_litecoin';

      const requests = await Promise.all(
        payroll_data.docs.map(async (doc) => {
          const user = await db.collection('users').doc(doc.get('id')).get();
          const amount =
            blockchain == 'bitcoin'
              ? await this.cryptoapisService.getBTCExchange(
                Number(doc.get('total')),
              )
              : await this.cryptoapisService.getLTCExchange(
                Number(doc.get('total')),
              );
          await doc.ref.update({
            [`total_${wallet}`]: amount || 0,
          });
          return {
            address: user.get(wallet),
            amount: amount?.toString() || 0,
          };
        }),
      );

      const requests_empty = requests.filter((r) => r.address && r.amount > 0);
      const res = await this.cryptoapisService.sendRequestTransaction(
        requests_empty,
        blockchain as 'bitcoin' | 'litecoin',
      );

      return res;
    }
  }

  /**
   * Calcular payroll real
   * Se usa para cuando se borra algun registro manual y hay que recalcular
   */
  async fixPayrollAmount(id: string) {
    const payroll_data = await db
      .collection('payroll')
      .doc(id)
      .collection('details')
      .get();

    const amount = payroll_data.docs.reduce(
      (a, b) => a + Number(b.get('total')),
      0,
    );

    return amount;
  }

  async withdraw(
    address: string,
    amount: string,
    blockchain: 'bitcoin' | 'litecoin',
  ) {
    if (blockchain == 'bitcoin' || blockchain == 'litecoin') {
      await db.collection('withdraws').add({
        created_at: new Date(),
        address,
        amount,
        blockchain,
      });
      return this.cryptoapisService.withdraw(address, amount, blockchain);
    }
  }

  async reduceWalletAmount(address: string, amount: number) {
    const addresses = await db
      .collection('wallets')
      .where('address', '==', address)
      .get();

    if (addresses.size > 0) {
      await addresses.docs[0].ref.collection('history').add({
        before: addresses.docs[0].data(),
        payload: {
          description: 'Withdraw',
          amount,
          created_at: new Date(),
        },
      });
      await addresses.docs[0].ref.update({
        amount: Number(addresses.docs[0].get('amount')) - amount,
        updated_at: new Date(),
      });
    }
  }

  async usersJson() {
    const res = await db.collection('users').get();
    const users = res.docs.map((r) => ({ id: r.id, ...r.data() }));
    fs.writeFileSync('users.json', JSON.stringify(users));
  }

  async removePayroll() {
    const res = await db.collectionGroup('payroll').get();

    for (const doc of res.docs) {
      await doc.ref.delete();
    }
  }

  async addLostProfit(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string,
  ) {
    const userRef = await db.collection('users').doc(registerUserId).get();
    const user_name = userRef.get('name');
    await db.collection('users').doc(id_user).collection('lost_profits').add({
      description: 'Has perdido un bono por membresia inactiva',
      id_user: registerUserId,
      user_name,
      amount,
      created_at: new Date(),
      type,
    });
  }

  async execParticipationsBonus(amount: number) {
    /**
     * Obtener usuarios que se les va pagar
     */
    const participations = await db
      .collectionGroup('participations')
      .where('next_pay', '<=', new Date())
      .get();

    let wallets = [];

    for (const part of participations.docs) {
      //console.log(part.data().email)
      const userQuery = await db
        .collection('users')
        .where('email', '==', part.data().email)
        .get();

      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        const wallet = userDoc.data().wallet_litecoin;

        if (wallet) {
          wallets.push({ wallet });
        }
      }
    }

    /**
     * Calcular cuanto se le va pagar a cada uno
     */
    const pay_usd_per_user = Number(
      Number(amount / participations.size).toFixed(2),
    );

    /**
     * Convertir USD a LTC
     */
    const pay_ltc_per_user = await this.cryptoapisService.getLTCExchange(
      pay_usd_per_user,
    );
    /**
     * Crear arregle con los datos wallet + amount
     */
    const requests = wallets
      .map((doc) => ({
        address: doc.wallet,
        amount: `${pay_ltc_per_user}`,
      }))
      .filter((r) => r.address);

    console.log(requests);

    /**
     * Guardar historial
     */
    await db.collection('paticipations-payments-history').add({
      created_at: new Date(),
      amount,
      pay_usd_per_user,
      pay_ltc_per_user,
      requests,
    });

    const batch = db.batch();

    //Cambiar el next_pay de cada uno

    let next_pay = new Date();
    next_pay.setMonth(next_pay.getMonth() + 2);

    participations.forEach((doc) => {
      batch.update(doc.ref, {
        next_pay,
        participation_cap_current:
          firestore.FieldValue.increment(pay_usd_per_user),
      });
    });

    await batch.commit();

    /**
     * Enviar petición a cryptoapis
     */
    await this.cryptoapisService.sendRequestTransaction(
      requests,
      'litecoin',
      'Pago de participaciones',
    );
  }
}
