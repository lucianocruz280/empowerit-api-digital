import { Controller, Get, Query, Body, Post, Param } from '@nestjs/common';
import { MEMBERSHIP_CAP, SubscriptionsService } from './subscriptions.service';
import {
  PayloadAssignBinaryPosition,
  PayloadAssignBinaryPositionForAutomaticFranchises,
} from './types';
import { auth, db } from 'src/firebase/admin';
import { firestore } from 'firebase-admin';
import dayjs from 'dayjs';

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionService: SubscriptionsService) {}

  @Get('isActiveUser')
  isActiveUser(@Query('idUser') idUser: string) {
    return this.subscriptionService.isActiveUser(idUser);
  }

  @Post('createPaymentAddressForCredits/:type')
  async createPaymentAddressProForCredits(
    @Body() body,
    @Param('type') type: PackCredits,
  ) {
    try {
      return await this.subscriptionService.createPaymentAddressForCredits(
        body.userId,
        type,
        body.coin,
      );
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  @Post('createPaymentAddressForParticipations/:type')
  async createPaymentAddressForParticipations(
    @Body() body,
    @Param('type') type: PackParticipations,
  ) {
    try {
      return await this.subscriptionService.createPaymentAddressForParticipations(
        body.userId,
        type,
        body.coin,
      );
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  @Post('statusToExpired')
  statusToExpired() {
    return this.subscriptionService.statusToExpired();
  }

  @Post('createPaymentAddressForAutomaticFranchises/:type')
  async createPaymentAddressForAutomaticFranchises(
    @Body() body,
    @Param('type') type: AutomaticFranchises,
  ) {
    try {
      return await this.subscriptionService.createPaymentAddressForAutomaticFranchises(
        body.userId,
        type,
        body.coin,
        body.period,
      );
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }


  @Post('createPaymentAddress/:type')
  async createPaymentAddressPro(
    @Body() body,
    @Param('type') type: Memberships,
  ) {
    try {
      console.log(type);
      return await this.subscriptionService.createDisruptivePayment(
        body.userId,
        type,
        body.coin
      )
      return await this.subscriptionService.createPaymentAddress(
        body.userId,
        type,
        body.coin,
        body.period,
      );
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  @Post('assignBinaryPosition')
  async assignBinaryPosition(
    @Body()
    body: PayloadAssignBinaryPosition,
  ) {
    return this.subscriptionService.assignBinaryPosition(body, true);
  }

  @Post('assignBinaryPositionForAutomaticFranchises')
  async assignBinaryPositionForAutomaticFranchises(
    @Body()
    body: PayloadAssignBinaryPositionForAutomaticFranchises,
  ) {
    return this.subscriptionService.assignBinaryPositionForAutomaticFranchises(
      body,
      true,
    );
  }

  @Post('assignSanguine')
  async assignSanguine(
    @Body()
    body: PayloadAssignBinaryPosition,
  ) {
    return await this.subscriptionService.insertSanguineUsers(body.id_user);
  }

  @Post('removeBinaryPoints')
  async removeBinaryPoints() {
    const USER_ID = 'HXKIeby39kZRsJwaxjlFTRX7zpg2';

    const res = await db
      .collectionGroup('points')
      .where('user_id', '==', USER_ID)
      .get();

    const res1 = await db
      .collectionGroup('right-points')
      .where('user_id', '==', USER_ID)
      .get();

    const res2 = await db
      .collectionGroup('left-points')
      .where('user_id', '==', USER_ID)
      .get();

    await Promise.all(res.docs.map((doc) => doc.ref.delete()));
    await Promise.all(res1.docs.map((doc) => doc.ref.delete()));
    await Promise.all(res2.docs.map((doc) => doc.ref.delete()));

    console.log({
      points: res.size,
      right: res1.size,
      left: res2.size,
    });
  }

  @Post('activeWithoutVolumen')
  async activeWithoutVolumen(@Body() body) {
    if (!body.sponsor_id) throw new Error('sponsor_id required');
    if (!body.email) throw new Error('email required');
    if (!body.side) throw new Error('side: left or right required');
    if (!body.membership) throw new Error('membership required');

    console.log(body);

    // if (body.membership != '49-pack' && !MEMBERSHIP_CAP[body.membership])
    //   throw new Error('el type esta mal: ' + body.membership);

    await db
      .collection('users')
      .doc(body.sponsor_id)
      .update({
        count_direct_people: firestore.FieldValue.increment(1),
      });
      console.log("paso increment");
    const res = await db
      .collection('users')
      .where('email', '==', body.email)
      .get();
    let user_id;
    if (res.empty) {
      const user = await auth.createUser({
        email: body.email,
        password: body.password || '123987xd',
      });
      user_id = user.uid;
      console.log("se creo el usuario");
      await db
        .collection('users')
        .doc(user.uid)
        .set({
          email: body.email,
          name: body.name || '',
          sponsor: body.sponsor || '',
          sponsor_id: body.sponsor_id,
          position: body.side,
          created_at: new Date(),
          count_underline_people: 0,
        });
    } else {
      user_id = res.docs[0].id;
    }
    const user = await db.collection('users').doc(user_id).get();

    await db.collection('admin-activations').add({
      id_user: user_id,
      created_at: new Date(),
      membership: body.membership,
    });

    await sleep(5000);

    await this.subscriptionService.assingMembershipWithoutCredits(
      user_id,
      body.membership,
    );
    console.log("se asigno la membresia");
    if (!user.get('parent_binary_user_id')) {
      await this.subscriptionService.insertSanguineUsers(user_id);
      console.log("sanguinea");
      await this.subscriptionService.assignBinaryPosition(
        {
          id_user: user_id,
          position: body.side,
          sponsor_id: body.sponsor_id,
          is_new: false,
        },
        false,
      );
    }
    console.log("posicion binaria");
    const sponsorRef = await db.collection('users').doc(body.sponsor_id).get();
    const sponsorName = await sponsorRef.get('name');
    const userNew = await db.collection('users').doc(user_id).get();
    const uplineId = await userNew.get('parent_binary_user_id');

    await db.collection('memberships-history').add({
      activated: 'Activada Sin Volumen',
      created_at: new Date(),
      date: new Date(),
      email: body.email,
      membership: body.membership,
      name: body.name,
      position: body.side,
      sponsor: sponsorName,
      upline: uplineId,
      user_id,
      currency: null,
    });

    return {
      status: 200,
    };
  }

  @Post('activeWithVolumen')
  async activeWithVolumen(@Body() body) {
    if (!body.user_id) throw new Error('user_id required');
    if (!body.membership) throw new Error('membership required');

    await db
      .collection('admin-actionvations-with-volume')
      .add({ ...body, created_at: new Date() });

    await this.subscriptionService.onPaymentMembership(
      body.user_id,
      body.membership,
      null,
      'Activacion con volumen',
    );
  }

  @Post('sendPack')
  sendPack(@Body() body) {
    return this.subscriptionService.createShopifyPack(body.user_id, body.pack);
  }

  @Post('addCredits/:id')
  addCredits(@Body() body, @Param('id') id: string) {
    return this.subscriptionService.addCreditsManual(id, body.credits);
  }

  @Post('payAutomaticFranchisePerformance')
  payAutomaticFranchisePerformance() {
    return this.subscriptionService.payAutomaticFranchisePerformance();
  }

  @Post('payAutomaticFranchiseCapitalPerformance')
  payAutomaticFranchiseCapitalPerformance() {
    return this.subscriptionService.payAutomaticFranchiseCapitalPerformance();
  }

  @Post('quickPayForAutomaticFranchisePerformance')
  quickPayForAutomaticFranchisePerformance(@Body() body) {
    if (!body.doc_id) throw new Error('doc_id is required');
    if (!body.user_id) throw new Error('user_id is required');
    return this.subscriptionService.quickPayForAutomaticFranchisePerformance(
      body.doc_id,
      body.user_id,
      body.is_capital,
    );
  }

  @Post('normalPayForAutomaticFranchisePerformance')
  normalPayForAutomaticFranchisePerformance(@Body() body) {
    if (!body.doc_id) throw new Error('doc_id is required');
    if (!body.user_id) throw new Error('user_id is required');
    return this.subscriptionService.normalPayForAutomaticFranchisePerformance(
      body.doc_id,
      body.user_id,
      body.is_capital,
    );
  }

  @Post('activateAutomaticFranchiseWithoutVolumenForFranchises/:type')
  activateAutomaticFranchiseWithoutVolumenForFranchises(
    @Body() body,
    @Param('type') type: AutomaticFranchises,
  ) {
    if (!body.email) throw new Error('email is required');
    if (!type) throw new Error('type is required');
    return this.subscriptionService.activateAutomaticFranchiseWithoutVolumenForFranchises(
      body.email,
      type,
    );
  }
}
