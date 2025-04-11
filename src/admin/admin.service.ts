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
import { RanksService } from 'src/ranks/ranks.service';
import axios from 'axios';

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

export const disruptiveUrl = axios.create({
  baseURL: 'https://my.disruptivepayments.io/api/payments/single',
  headers: {
    'Content-Type': 'application/json',
    'client-api-key': 'qwyijs74vsjug5hn50nlfmcbzqic1l1743038848523',
  },
});

@Injectable()
export class AdminService {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly binaryService: BinaryService,
    private readonly rankService: RanksService
  ) { }

  getBinaryPercentByRank(user_id: string) {
    return this.rankService.getRankUser(user_id).then((data) => {
      const isAdmin = ADMIN_USERS.includes(user_id);
      return isAdmin ? ADMIN_BINARY_PERCENT : data.binary_percent as number;
    });
  }

  async getPayroll() {
    const users = await db.collection('users').get();
    const docs = users.docs.map((r) => ({ id: r.id, ...r.data() }));

    const payroll_data = await Promise.all(
      docs.map(async (docData: any) => {
        const hasInfinitePoints = INFINITE_POINTS.includes(docData.id);
        const binary_side = hasInfinitePoints
          ? 'right'
          : docData.left_points > docData.right_points
            ? 'right'
            : 'left';

        const binary_points = docData[`${binary_side}_points`];
        const binary_percent = await this.getBinaryPercentByRank(docData.id);

        const res: ResPayroll = {
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

        return {
          ...res,
          total: res.bond_direct + res.bond_investment + res.bond_binary,
        };
      }),
    );

    const filtered_sorted = payroll_data
      .filter((doc) => doc.total > 0)
      .sort((a, b) => b.total - a.total);

    const payroll_data_2 = await Promise.all(
      filtered_sorted.map(async (doc) => ({
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
    const url = 'https://my.disruptivepayments.io/api/payments/mass'
    const clean_payroll_data = payroll_data
      .filter((doc) => doc.total >= 40)
      .filter((doc) => Boolean(doc.wallet_usdt));
    const body = {
      network: 'POLYGON',
      smartContractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      name: "Corte Mensual",
      "smartContractGetBalance": "getBalance",
      "smartContractSendCoin": "sendCoin",
      "eventGetSymbol": "symbol",
      "massPaymentType": 1,
      "accounts": [
        {
          "address": "XXXXXXXXXXXXXXX",
          "amount": 100
        },
        {
          "address": "XXXXXXXXXXXXXXX",
          "amount": 150
        }
      ]
    }
    const clean_payroll_data_sin_investment = clean_payroll_data.map(({ bond_investment, ...rest }) => rest);
    await disruptiveUrl.post(url,)

    const ref = await db.collection('payroll').add({
      ...clean_payroll_data,
      total_usd: clean_payroll_data_sin_investment.reduce((a, b) => a + b.total, 0),
      created_at: new Date(),
    });
    await Promise.all(
      clean_payroll_data_sin_investment.map(async (doc) => {
        await ref.collection('details').add(doc);
        await db.collection(`users/${doc.id}/payroll`).add({
          ...doc,
          created_at: new Date(),
        });
      }),
    );

    for (const doc of clean_payroll_data_sin_investment) {
      await db
        .collection('users')
        .doc(doc.id)
        .update({
          profits: doc.profits + doc.total,
          bond_quick_start: 0,

        });
      await this.binaryService.matchBinaryPoints(doc.id)
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
