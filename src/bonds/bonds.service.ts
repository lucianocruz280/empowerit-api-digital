import { Injectable } from '@nestjs/common';
import { db as admin } from '../firebase/admin';
import { UsersService } from 'src/users/users.service';
import { firestore } from 'firebase-admin';
import {
  BOND_CAR,
  Bonds,
  menthor_percent,
  messages,
  quick_start_percent,
  quick_start_percent_by_Franchise,
} from './bonds';
import { Ranks } from 'src/ranks/ranks_object';

export async function availableCap(registerUserId: string, cash: number) {
  const user = await admin.collection('users').doc(registerUserId).get();
  const membership_cap_current = user.get('membership_cap_current');
  const membership_cap_limit = user.get('membership_cap_limit');
  if (cash <= membership_cap_limit - membership_cap_current) {
    return cash;
  }
  return membership_cap_limit - membership_cap_current;
}

const round2 = (amount) => {
  return Math.round(amount * 100) / 100;
};

@Injectable()
export class BondsService {
  constructor(private readonly userService: UsersService) { }

  async addBond(
    user_id: string, // usuario que recibe el bono
    type: Bonds,
    amount: number,
    add_to_balance = true,
    user_origin_bond?: string, // usuario que detono el bono
  ) {
    const active_limit = await this.getNextCap(user_id);

    if (active_limit) {
      const {
        id: membership_id,
        membership_cap_limit,
        membership_cap_current,
      } = active_limit;

      const real = this.getRemaing(
        amount,
        membership_cap_limit,
        membership_cap_current,
      );

      const batch = admin.batch();

      const update: any = {
        profits: firestore.FieldValue.increment(real),
        [type]: firestore.FieldValue.increment(real),
      };

      if (add_to_balance) {
        update.balance = firestore.FieldValue.increment(real);
      }

      await this.addProfitDetail(
        user_id,
        type,
        real,
        user_origin_bond,
      );

      batch.update(admin.collection('users').doc(user_id), update);

      const new_status =
        membership_cap_current + real >= membership_cap_limit
          ? 'expired'
          : 'paid';

      batch.update(
        admin
          .collection('users')
          .doc(user_id)
          .collection('memberships')
          .doc(membership_id),
        {
          membership_cap_current: firestore.FieldValue.increment(real),
          membership_status: new_status,
        },
      );

      await batch.commit();

      if (real < amount) {
        return this.addBond(
          user_id,
          type,
          amount - real,
          true,
          user_origin_bond,
        );
      }
    } else {
      await this.addLostProfit(user_id, type, amount, user_origin_bond);
    }
  }

  async execBinaryBond(userId: string, smart_leg_points: number) {
    console.log('execBinaryBond', { userId });
    const userRef = admin.collection('users').doc(userId);
    const user = await userRef.get();
    const percent = 0.1;

    // primer nivel
    if (user.exists) {
      const amount = round2(smart_leg_points * percent);

      await this.execUserBinaryBond(userId, amount);
    }
  }

  async payPoints() {
    const users = await admin
      .collection('users')
      .where('membership', '!=', null)
      .get();

    for (const u of users.docs) {
      try {
        const small_leg =
          u.get('left_points') > u.get('right_points') ? 'right' : 'left';
        const points = u.get(`${small_leg}_points`);

        if (points > 0) {
          await this.execBinaryBond(u.id, points);
        }
      } catch (err) {
        console.error('error binary', u.id, err);
      }
    }
  }

  async execUserBinaryBond(registerUserId: string, amount: number) {
    await this.addBond(registerUserId, Bonds.BINARY, amount, null);
  }

  async getNextCap(user_id: string): Promise<null | {
    membership_cap_limit: number;
    membership_cap_current: number;
    id: string;
  }> {
    return await admin
      .collection('users')
      .doc(user_id)
      .get().then((d) => ({id:d.data().membership, ...d.data()} as any))
  }

  getRemaing(amount: number, cap_limit: number, cap_current: number) {
    const remaing = cap_limit - cap_current;
    const real = remaing > amount ? amount : remaing;
    return real;
  }


  /**
   * solo se reparte este bono a los usuarios activos
   */
  async execUserDirectBond(
    registerUserId: string,
    membership_price: number,
    is_new: boolean,
    isParticipation = false,
    registerFranchiseIsAutomatic = false,
    type = '',
  ) {
    console.log('execUserDirectBond', { registerUserId }, { membership_price });
    const user = await admin.collection('users').doc(registerUserId).get();
    console.log("el type es", type)
    const sponsor_id = user.get('sponsor_id');
    const sponsorRef = admin.collection('users').doc(sponsor_id);
    const sponsor = await sponsorRef.get().then((r) => r.data());
    const hasAutomaticFranchises = sponsor?.has_automatic_franchises ?? false;
    console.log(is_new ? 'El usuario es nuevo' : 'El usuario no es nuevo');
    let percent = 0;
    let investment_percent = 0
    const is_new_pack = [
      '100-pack',
      '300-pack',
      '500-pack',
      '1000-pack',
      '2000-pack',
      '3000-pack',
    ].includes(sponsor.membership);
    const digital_pack = ['FD150', 'FD300', 'FD500'].includes(type);

    console.log(sponsor.membership, { is_new_pack });

    /* Aca entraran todas las franquicias digitales, de producto y todo el pedo */

    if (digital_pack) {
      percent = 40 / 100;
      investment_percent = 15 / 100
      console.log("entro al else de 40 / 100")
    }

    // primer nivel
    if (sponsor) {
      const isProActive = await this.userService.isActiveUser(sponsor_id);
      const amount = Math.round(membership_price * percent * 100) / 100;
      const amount_investment = amount * investment_percent
      let availableAmount = amount - amount_investment;

      if (is_new_pack) {
        availableAmount = await availableCap(sponsor_id, amount);
      }
      console.log("el available amount es", availableAmount)
      /* Aqui */
      if (isProActive) {
        if (is_new_pack) {
          await sponsorRef.update({
            [Bonds.QUICK_START]:
              firestore.FieldValue.increment(availableAmount),
            membership_cap_current:
              firestore.FieldValue.increment(availableAmount),
            [Bonds.INVESTMENT]:
              firestore.FieldValue.increment(amount_investment)
          });
        } else {
          await sponsorRef.update({
            [Bonds.QUICK_START]:
              firestore.FieldValue.increment(availableAmount),
            [Bonds.INVESTMENT]:
              firestore.FieldValue.increment(amount_investment)
          });
        }
        await this.addProfitDetail(
          sponsorRef.id,
          Bonds.QUICK_START,
          availableAmount,
          user.id,
        );
        await this.addProfitDetail(
          sponsorRef.id,
          Bonds.INVESTMENT,
          amount_investment,
          user.id
        )
      } else {
        await this.addLostProfit(
          sponsorRef.id,
          Bonds.QUICK_START,
          amount,
          user.id,
        );
      }
    }
  }

  async execMentorBond(
    sponsorId: string,
    directUserId: string,
    rank: string,
    binary_total: number,
  ) {
    const percent = menthor_percent[rank];

    const mentor_total = Number(
      Number(binary_total * (percent / 100)).toFixed(2),
    );
    const availableAmount = await availableCap(sponsorId, mentor_total);

    await admin
      .collection('users')
      .doc(sponsorId)
      .update({
        [Bonds.MENTOR]: firestore.FieldValue.increment(availableAmount),
      });

    await this.addProfitDetail(
      sponsorId,
      Bonds.MENTOR,
      availableAmount,
      directUserId,
    );
  }

  async execCarBond(userId: string) {
    console.log('execCarBond', {
      userId,
    });
    await admin
      .collection('users')
      .doc(userId)
      .update({
        [Bonds.CAR]: firestore.FieldValue.increment(BOND_CAR),
      });

    await this.addProfitDetail(userId, Bonds.CAR, BOND_CAR);
  }

  async execBondPresenter(
    amount: number,
    registerUserId: string,
    presenter1: string,
    presenter2?: string,
  ) {
    const percent = (presenter2 ? 1 : 2) / 100;
    const total = Math.round(amount * percent * 100) / 100;

    if (presenter1) {
      const u_presenter_1 = await admin
        .collection('users')
        .doc(presenter1)
        .get();

      if (u_presenter_1.exists) {
        const is_new_pack = [
          '100-pack',
          '300-pack',
          '500-pack',
          '1000-pack',
          '2000-pack',
        ].includes(u_presenter_1.get('membership'));
        let availableAmount = total;
        if (is_new_pack) {
          availableAmount = await availableCap(u_presenter_1.id, total);
        }

        if (is_new_pack) {
          await u_presenter_1.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
            /* membership_cap_current:
              firestore.FieldValue.increment(availableAmount), */
          });
        } else {
          await u_presenter_1.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
          });
        }

        await this.addProfitDetail(
          u_presenter_1.id,
          Bonds.PRESENTER,
          availableAmount,
          registerUserId,
        );
      }
    }

    if (presenter2) {
      const u_presenter_2 = await admin
        .collection('users')
        .doc(presenter2)
        .get();

      if (u_presenter_2.exists) {
        const is_new_pack = [
          '100-pack',
          '300-pack',
          '500-pack',
          '1000-pack',
          '2000-pack',
        ].includes(u_presenter_2.get('membership'));
        let availableAmount = total;
        if (is_new_pack) {
          availableAmount = await availableCap(u_presenter_2.id, total);
        }
        if (is_new_pack) {
          await u_presenter_2.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
            /* membership_cap_current:
              firestore.FieldValue.increment(availableAmount), */
          });
        } else {
          await u_presenter_2.ref.update({
            [Bonds.PRESENTER]: firestore.FieldValue.increment(availableAmount),
          });
        }

        await this.addProfitDetail(
          u_presenter_2.id,
          Bonds.PRESENTER,
          availableAmount,
          registerUserId,
        );
      }
    }
  }

  async execPresenterBonus(
    registerUserId: string,
    userId: string,
    total: number,
  ) {
    const availableAmount = await availableCap(userId, total);
    const userIdDoc = await admin.collection('users').doc(userId).get();
    const is_new_pack = [
      '100-pack',
      '300-pack',
      '500-pack',
      '1000-pack',
      '2000-pack',
    ].includes(userIdDoc.get('membership'));

    await this.addProfitDetail(
      userId,
      Bonds.PRESENTER,
      availableAmount,
      registerUserId,
    );
    if (is_new_pack) {
      await admin
        .collection('users')
        .doc(userId)
        .update({
          bond_presenter: firestore.FieldValue.increment(availableAmount),
          /* membership_cap_current:
            firestore.FieldValue.increment(availableAmount), */
        });
    } else {
      await admin
        .collection('users')
        .doc(userId)
        .update({
          bond_presenter: firestore.FieldValue.increment(availableAmount),
        });
    }
    return 'OK';
  }

  async addProfitDetail(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId?: string,
  ) {
    const profit: any = {
      description: messages[type],
      amount,
      created_at: new Date(),
      type,
    };

    if (registerUserId) {
      const userRef = await admin.collection('users').doc(registerUserId).get();
      const user_name = userRef.get('name');
      profit.user_name = user_name;
      profit.id_user = registerUserId;
    }

    await admin
      .collection('users')
      .doc(id_user)
      .collection('profits_details')
      .add(profit);
  }

  async addLostProfit(
    id_user: string,
    type: Bonds,
    amount: number,
    registerUserId: string,
  ) {
    const userRef = await admin.collection('users').doc(registerUserId).get();
    const user_name = userRef.get('name');
    await admin
      .collection('users')
      .doc(id_user)
      .collection('lost_profits')
      .add({
        description: 'Has perdido un bono por membresia inactiva',
        id_user: registerUserId,
        user_name,
        amount,
        created_at: new Date(),
        type,
      });
  }

  async resetUserProfits(id_user: string) {
    const bonds = Object.keys(messages).reduce((a, key) => {
      a[key] = 0;
      return a;
    }, {});
    await admin.collection('users').doc(id_user).update(bonds);
  }

  async getSponsor(user_id: string) {
    const user = await admin.collection('users').doc(user_id).get();
    const sponsor_id = user.get('sponsor_id');
    const sponsor = await admin.collection('users').doc(sponsor_id).get();

    return {
      id: sponsor_id,
      ref: sponsor.ref,
      data: sponsor,
    };
  }
}


