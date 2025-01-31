import * as https from 'https';
import { Injectable } from '@nestjs/common';
import { db } from '../firebase/admin';
import {
  ResponseCreateWalletAddress,
  ResponseNewUnconfirmedCoinsTransactions,
  ResponseNewConfirmedCoinsTransactions,
  CallbackNewUnconfirmedCoins,
  CallbackNewConfirmedCoins,
  ResponseBalanceAddress,
  ResponseListOfEvents,
  TransactionRequest,
} from './types';
import axios from 'axios';
import { firestore } from 'firebase-admin';
import { ResponseConvert } from './types/conlayer';
import dayjs from 'dayjs';

const accounts = {
  victor: {
    apiKey: 'fb00b4aa1965ff6bc36b5fba67447a3c927f2f6a',
    walletIdProd: '64cbde4178ffd80007affa0f',
    walletIdTest: '64c6dd54aa48640007b8e26f',
  },
  saul: {
    apiKey: 'd43720cee164a22fdfb9f2ec70bbec8fc0efcbd2',
    walletIdProd: '658213a1b50a7c0007a7a30b',
    walletIdTest: '658213c9b50a7c0007a7a30d',
  },
};

const default_options = {
  hostname: 'rest.cryptoapis.io',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': accounts.saul.apiKey,
  },
};

const cryptoApis = axios.create({
  baseURL: 'https://rest.cryptoapis.io',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': accounts.saul.apiKey,
  },
});

const api_conlayer = axios.create({
  baseURL: 'http://api.coinlayer.com/',
});

const streamResponse = (resolve: any, reject: any) => (res: any) => {
  const chunks: any[] = [];

  res.on('data', function (chunk: any) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    resolve(JSON.parse(body.toString()));
  });

  res.on('error', reject);
};

const cryptoapisRequest = async <Response>(
  options: any,
  body?: any,
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, streamResponse(resolve, reject));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

@Injectable()
export class CryptoapisService {
  walletId =
    process.env.CUSTOM_ENV == 'production'
      ? accounts.saul.walletIdProd
      : accounts.saul.walletIdTest;
  blockchain = 'litecoin';
  network = process.env.CUSTOM_ENV == 'production' ? 'mainnet' : 'testnet';
  hostapi = process.env.API_URL;

  async removeSubscriptionEvent(referenceId: string) {
    const options = {
      ...default_options,
      method: 'DELETE',
      path: `/v2/blockchain-events/bitcoin/mainnet/subscriptions/${referenceId}`,
    };
    await cryptoapisRequest(options);
  }

  async createNewWalletAddress(currency: Coins) {
    const blockchain = this.getBlockchainFromCurrency(currency);

    const res: ResponseCreateWalletAddress = await cryptoApis
      .post(
        `/wallet-as-a-service/wallets/${this.walletId}/${blockchain}/${this.network}/addresses`,
        {
          context: 'yourExampleString',
          data: {
            item: {
              label: 'yourLabelStringHere',
            },
          },
        },
      )
      .then((r) => r.data);

    await db.collection('wallets').add({
      currency,
      address: res.data.item.address,
      blockchain,
      created_at: new Date(),
      using: true,
    });

    return res.data.item.address;
  }

  getBlockchainFromCurrency(currency: Coins) {
    if (currency == 'LTC') return 'litecoin';
    return 'bitcoin';
  }

  getQRNameFromCurrency(currency: Coins) {
    if (currency == 'LTC') return 'litecoin';
    return 'bitcoin';
  }

  async createFirstConfirmationTransactionForCredits(
    userId: string,
    address: string,
    type: PackCredits,
    currency: Coins,
  ) {
    const blockchain = this.getBlockchainFromCurrency(currency);
    console.log(blockchain);
    try {
      const options = {
        ...default_options,
        method: 'POST',
        path: `/v2/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-unconfirmed`,
        qs: { context: userId },
      };
      const payload = {
        context: userId,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: 'a12k*?_1ds',
            /* Agrega este callbackpayment en la queue en cloud functions */
            callbackUrl: `${this.hostapi}/cryptoapis/callbackPaymentForCredits/${type}/queue`,
          },
        },
      };
      try {
        const response = await cryptoApis.post(
          `/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-unconfirmed`,
          payload,
        );
        return response;
      } catch (error) {
        console.log(error);
      }
    } catch (err) {
      console.error(JSON.stringify(err));
      return null;
    }
  }

  async createFirstConfirmationTransaction(
    userId: string,
    address: string,
    type:
      | Memberships
      | PackCredits
      | PackParticipations
      | AutomaticFranchises
      | MembershipsProductsNames,
    currency: Coins,
    callback: string,
  ) {
    const blockchain = this.getBlockchainFromCurrency(currency);
    try {
      const options = {
        ...default_options,
        method: 'POST',
        path: `/v2/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-unconfirmed`,
        qs: { context: userId },
      };
      const payload = {
        context: userId,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: 'a12k*?_1ds',
            /* Agrega este callbackpayment en la queue en cloud functions */
            callbackUrl: `https://empowerit-api-7iqymuyxsa-uc.a.run.app/cryptoapis/${callback}/${type}/queue`,
          },
        },
      };
      const res =
        await cryptoapisRequest<ResponseNewUnconfirmedCoinsTransactions>(
          options,
          payload,
        );
      return res;
    } catch (err) {
      console.error(JSON.stringify(err));
      return null;
    }
  }

  async removeCallbackEvent(refereceId: string, currency: Coins) {
    try {
      const blockchain = this.getBlockchainFromCurrency(currency);
      await cryptoApis.delete(
        `/v2/blockchain-events/${blockchain}/mainnet/subscriptions/${refereceId}`,
      );
    } catch (error) {
      console.log(error);
    }
  }

  async createCallbackConfirmationForCredits(
    id_user: string,
    address: string,
    type: PackCredits,
    currency: Coins,
  ) {
    const blockchain = this.getBlockchainFromCurrency(currency);
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-confirmed`,
    };
    return await cryptoapisRequest<ResponseNewConfirmedCoinsTransactions>(
      options,
      {
        context: id_user,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: 'a12k*?_1ds',
            callbackUrl: `https://empowerit-api-7iqymuyxsa-uc.a.run.app/cryptoapis/callbackPaymentForCredits/${type}/queue`,
            receiveCallbackOn: 2,
          },
        },
      },
    );
  }

  async createCallbackConfirmationForAutomaticFranchises(
    id_user: string,
    address: string,
    type: AutomaticFranchises,
    currency: Coins,
  ) {
    const blockchain = this.getBlockchainFromCurrency(currency);
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-confirmed`,
    };
    return await cryptoapisRequest<ResponseNewConfirmedCoinsTransactions>(
      options,
      {
        context: id_user,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: 'a12k*?_1ds',
            callbackUrl: `https://empowerit-api-7iqymuyxsa-uc.a.run.app/cryptoapis/callbackPaymentForAutomaticFranchises/${type}/queue`,
            receiveCallbackOn: 2,
          },
        },
      },
    );
  }

  async createCallbackConfirmation(
    id_user: string,
    address: string,
    type:
      | Memberships
      | PackParticipations
      | AutomaticFranchises
      | MembershipsProductsNames,
    currency: Coins,
    callback: string,
  ) {
    const blockchain = this.getBlockchainFromCurrency(currency);
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-confirmed`,
    };
    return await cryptoapisRequest<ResponseNewConfirmedCoinsTransactions>(
      options,
      {
        context: id_user,
        data: {
          item: {
            address: address,
            allowDuplicates: true,
            callbackSecretKey: 'a12k*?_1ds',
            callbackUrl: `https://empowerit-api-7iqymuyxsa-uc.a.run.app/cryptoapis/${callback}/${type}/queue`,
            receiveCallbackOn: 2,
          },
        },
      },
    );
  }

  sendRequestTransaction = async (
    recipients: { address: string; amount: string }[],
    blockchain: 'bitcoin' | 'litecoin',
    note = 'yourAdditionalInformationhere',
  ) => {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/wallet-as-a-service/wallets/${this.walletId}/${blockchain}/${this.network}/transaction-requests`,
    };
    return await cryptoapisRequest(options, {
      context: '',
      data: {
        item: {
          callbackSecretKey: 'a12k*?_1ds',
          callbackUrl: `${this.hostapi}/callbackSendedCoins`,
          feePriority: 'standard',
          note,
          prepareStrategy: 'minimize-dust',
          recipients,
        },
      },
    });
  };

  getBTCExchange = async (amount: number) => {
    return axios
      .get('https://blockchain.info/tobtc?currency=USD&value=' + amount)
      .then((r) => r.data);
  };

  btcToSatoshi = (btc_amount: string): number => {
    return Number(btc_amount) * 100000000;
  };

  satoshiToBTC = (satoshi_amount: number): string => {
    return (Number(satoshi_amount) / 100000000).toString();
  };

  async validateWallet(wallet: string, blockchain = 'bitcoin') {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-tools/${blockchain}/mainnet/addresses/validate`,
    };
    return cryptoapisRequest(options, {
      context: 'yourExampleString',
      data: {
        item: {
          address: wallet,
        },
      },
    });
  }

  /**
   * Guardar registro de la transacción
   * dentro de una subcolección llamada 'transactions'
   * perteneciente a 'users'.
   */
  addTransactionToUser = async (
    user_id: string,
    transactionBody: CallbackNewUnconfirmedCoins | CallbackNewConfirmedCoins,
  ): Promise<boolean> => {
    const { event } = transactionBody.data;

    console.log(
      'addTransactionToUser',
      event,
      transactionBody.data.item.address,
    );

    try {
      // Identificar el evento que guardara el registro.
      let resultado: boolean;
      switch (event) {
        case 'ADDRESS_COINS_TRANSACTION_UNCONFIRMED': {
          resultado = await this.addTransactionUnconfirmed(user_id, {
            ...transactionBody,
          } as CallbackNewUnconfirmedCoins);
          break;
        }
        case 'ADDRESS_COINS_TRANSACTION_CONFIRMED': {
          resultado = await this.addTransactionConfirmed(user_id, {
            ...transactionBody,
          } as CallbackNewConfirmedCoins);

          const wallet = await db
            .collection('wallets')
            .where('address', '==', transactionBody.data.item.address)
            .get();

          if (!wallet.empty) {
            await wallet.docs[0].ref.update({
              amount: firestore.FieldValue.increment(
                Number(transactionBody.data.item.amount),
              ),
              using: false,
            });
          }

          break;
        }
        default: {
          resultado = false;
          console.log('evento no reconocido');
          break;
        }
      }

      return resultado;
    } catch (e) {
      console.warn('Error al agregar transacción: ', e);
      return false;
    }
  };

  /**
   * Guardar registro de la transaccion
   * con evento ..._UNCONFIRMED
   */
  addTransactionUnconfirmed = async (
    user_id: string,
    transactionBody: CallbackNewUnconfirmedCoins,
  ): Promise<boolean> => {
    // Comprobar si ya existe registro de la transaccion
    const { transactionId } = transactionBody.data.item;
    const transactionDoc = await this.getTransactionOfUser(
      user_id,
      transactionId,
    );

    // Cancelar sí ya existe
    if (transactionDoc.size > 0) return false;

    // Guardar registro
    await db.collection(`users/${user_id}/transactions`).add({
      ...transactionBody,
      created_at: new Date(),
    });
    return true;
  };

  /**
   * Guardar registro de la transaccion
   * con evento ..._CONFIRMED
   */
  addTransactionConfirmed = async (
    user_id: string,
    transactionBody: CallbackNewConfirmedCoins,
  ): Promise<boolean> => {
    // Comprobar si ya existe registro de la transaccion
    const { transactionId } = transactionBody.data.item;
    const transactions = await this.getTransactionOfUser(
      user_id,
      transactionId,
    );

    /**
     * Sí no existe el registro
     * La agrega
     */
    if (transactions.size == 0) {
      await db.collection(`users/${user_id}/transactions`).add({
        ...transactionBody,
        created_at: new Date(),
      });
    } else {
      /**
       * Sí existe el registro
       * Lo modifica
       */
      const doc = transactions.docs[0];

      await doc.ref.update({
        [`data.event`]: 'ADDRESS_COINS_TRANSACTION_CONFIRMED',
        [`data.item.firstSeenInMempoolTimestamp`]:
          firestore.FieldValue.delete(),
      });
    }

    return true;
  };

  /**
   * Obtener un 'transaction'
   * de 'user'
   * con el id de la transacción
   */
  getTransactionOfUser = (
    user_id: string,
    transaction_id: string,
  ): Promise<FirebaseFirestore.DocumentData> => {
    return db
      .collection(`users/${user_id}/transactions`)
      .where(`data.item.transactionId`, '==', transaction_id)
      .get();
  };

  /**
   * Obtener todos los 'transaction'
   * de 'user'
   * con la dirección del wallet
   */
  getTransactionsOfUser = (
    user_id: string,
    addressWallet: string,
  ): Promise<FirebaseFirestore.DocumentData> => {
    return db
      .collection(`users/${user_id}/transactions`)
      .where(`data.item.address`, '==', addressWallet)
      .get();
  };

  /**
   * Calcular el monto pendiente a pagar.
   */
  calculatePendingAmount = async (
    id_user: string,
    addressWallet: string,
    totalAmount: number,
  ): Promise<number> => {
    try {
      // Calcular el monto ya pagado
      const paidAmount: number = await this.calculatePaidAmount(
        id_user,
        addressWallet,
      );

      // Calcular el monto pendiente y redondearlo
      const decimals = 8;
      const pendingAmount = totalAmount - paidAmount;
      const result: number =
        Math.ceil(pendingAmount * Math.pow(10, decimals)) /
        Math.pow(10, decimals);

      console.log({
        pendingAmount,
        result,
      });

      return result;
    } catch (e) {
      console.log('Error al calcular el monto pendiente: ', e);
      return totalAmount;
    }
  };

  /**
   * Calcular el monto ya pagado.
   */
  calculatePaidAmount = async (
    id_user: string,
    addressWallet: string,
  ): Promise<number> => {
    try {
      // Obtener las transacciones
      const transactions = await this.getTransactionsOfUser(
        id_user,
        addressWallet,
      );
      const sizeT = transactions.size;

      // Obtener monto pagado
      let paidAmount = 0;
      for (let i = 0; i < sizeT; i++) {
        const doc = transactions.docs[i];
        const data = doc.data();
        paidAmount += Number.parseFloat(data.data?.item?.amount);
      }

      return paidAmount;
    } catch (e) {
      console.log('Error al calcular el monto pagado: ', e);
      return 0;
    }
  };

  generateQrUrl = (
    address: string,
    amount: string,
    blockchain: 'bitcoin' | 'litecoin',
  ): string =>
    `https://api.qrserver.com/v1/create-qr-code/?size=225x225&data=${blockchain}:${address}?amount=${amount}`;

  async getAddressInfo(address: string): Promise<ResponseBalanceAddress> {
    const options = {
      ...default_options,
      method: 'GET',
      path: `/blockchain-data/${this.blockchain}/${this.network}/addresses/${address}/balance`,
    };
    return await cryptoapisRequest<ResponseBalanceAddress>(options);
  }

  async deleteUnusedBlockChainEvents() {
    const events = await this.getListOfEvents();
    console.log(events.data.items.length);
    for (const event of events.data.items) {
      const user = await db
        .collection('wallets')
        .where(`address`, '==', event.address)
        .where('created_at', '<', dayjs().add(-3, 'day').toDate())
        .get();

      if (!user.empty) {
        // eliminar callback
        await this.removeCallbackEvent(event.referenceId, 'LTC');
        console.log('deleted', event.referenceId);
      }
    }
  }

  async getListOfEvents() {
    return await cryptoApis
      .get<ResponseListOfEvents>(
        `/blockchain-events/${this.blockchain}/mainnet/subscriptions?limit=50`,
      )
      .then((r) => r.data);
  }

  async withdraw(
    address: string,
    amount: string,
    blockchain: 'bitcoin' | 'litecoin',
  ) {
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/wallet-as-a-service/wallets/${this.walletId}/${blockchain}/${this.network}/transaction-requests`,
    };
    return await cryptoapisRequest(options, {
      context: '',
      data: {
        item: {
          callbackSecretKey: 'a12k*?_1ds',
          callbackUrl: `${this.hostapi}/callbackSendedCoins`,
          feePriority: 'standard',
          note: 'WITHDRAW',
          prepareStrategy: 'minimize-dust',
          recipients: [
            {
              address,
              amount,
            },
          ],
        },
      },
    });
  }

  async getXRPExchange(usd: number) {
    const res = await api_conlayer.get<ResponseConvert>(
      `/convert?from=USD&to=XRP&amount=${usd}&access_key=c4aa2042e33beee513ff1f915279a3c9`,
    );

    return res.data.result;
  }

  async transactionIsCompletePaidForCredits(
    type: PackCredits,
    id_user: string,
  ) {
    const userDoc = await db.collection('users').doc(id_user).get();
    // Verificar si el pago se completo
    const required_amount = Number(
      userDoc.get(`payment_link_credits.${type}.amount`),
    );
    const tolerance = required_amount * 0.003;
    const address = userDoc.get(`payment_link_credits.${type}.address`);
    const currency = userDoc.get(`payment_link_credits.${type}.currency`);
    const pendingAmount: number = await this.calculatePendingAmount(
      userDoc.id,
      address,
      required_amount,
    );
    return {
      is_complete: pendingAmount - tolerance <= 0,
      pendingAmount,
      currency,
    };
  }

  async transactionIsCompletePaidForAutomaticFranchises(
    type: AutomaticFranchises,
    id_user: string,
  ) {
    const userDoc = await db.collection('users').doc(id_user).get();
    // Verificar si el pago se completo
    const required_amount = Number(
      userDoc.get(`payment_link_automatic_franchises.${type}.amount`),
    );
    const tolerance = required_amount * 0.003;
    const address = userDoc.get(
      `payment_link_automatic_franchises.${type}.address`,
    );
    const currency = userDoc.get(
      `payment_link_automatic_franchises.${type}.currency`,
    );
    const pendingAmount: number = await this.calculatePendingAmount(
      userDoc.id,
      address,
      required_amount,
    );
    return {
      is_complete: pendingAmount - tolerance <= 0,
      pendingAmount,
      currency,
    };
  }

  async transactionIsCompletePaid(
    type: Memberships | PackCredits | MembershipsProductsNames,
    id_user: string,
  ) {
    const userDoc = await db.collection('users').doc(id_user).get();
    // Verificar si el pago se completo
    const required_amount = Number(userDoc.get(`payment_link.${type}.amount`));
    const tolerance = required_amount * 0.003;
    const address = userDoc.get(`payment_link.${type}.address`);
    const currency = userDoc.get(`payment_link.${type}.currency`);
    const pendingAmount: number = await this.calculatePendingAmount(
      userDoc.id,
      address,
      required_amount,
    );
    return {
      is_complete: pendingAmount - tolerance <= 0,
      pendingAmount,
      currency,
    };
  }

  async transactionIsCompletePaidForParticipations(
    type: PackParticipations,
    id_user: string,
  ) {
    const userDoc = await db.collection('users').doc(id_user).get();
    // Verificar si el pago se completo
    const required_amount = Number(
      userDoc.get(`payment_link_participations.${type}.amount`),
    );
    const tolerance = required_amount * 0.003;
    const address = userDoc.get(`payment_link_participations.${type}.address`);
    const currency = userDoc.get(
      `payment_link_participations.${type}.currency`,
    );
    const pendingAmount: number = await this.calculatePendingAmount(
      userDoc.id,
      address,
      required_amount,
    );
    return {
      is_complete: pendingAmount - tolerance <= 0,
      pendingAmount,
      currency,
    };
  }

  async getAddressBalance(address: string, blockchain: 'bitcoin' | 'litecoin') {
    const res = await cryptoApis
      .get(
        `/v2/blockchain-data/${blockchain}/${this.network}/addresses/${address}/balance?context=yourExampleString`,
      )
      .then((r) => r.data);
    return Number(res.data.item.confirmedBalance.amount);
  }

  async recoverTransactionRequest(
    transactionRequestId: string,
    coin_amount?: string,
  ) {
    const transactionRequest = await db
      .collection('cryptoapis-transaction-requests')
      .doc(transactionRequestId)
      .get()
      .then((r) => r.data());

    const custom_payload = { ...transactionRequest.payload };

    if (coin_amount) {
      custom_payload.data.item.amount = coin_amount;
    }

    const res: TransactionRequest = await cryptoApis
      .post(
        `/v2/wallet-as-a-service/wallets/${this.walletId}/xrp/${this.network}/addresses/${transactionRequest.fromAddress}/transaction-requests?context=yourExampleString`,
        custom_payload,
      )
      .then((r) => r.data);

    return res;
  }

  async getUSDExchange(): Promise<number> {
    const res = await api_conlayer.get<ResponseConvert>(
      `/convert?from=USD&to=MXN&amount=1&access_key=c4aa2042e33beee513ff1f915279a3c9`,
    );

    return res.data.result;
  }

  /**
   * LITECOIN
   */
  async getLTCExchange(usd: number): Promise<number> {
    const res = await api_conlayer.get<ResponseConvert>(
      `/convert?from=USD&to=LTC&amount=${usd}&access_key=c4aa2042e33beee513ff1f915279a3c9`,
    );

    return res.data.result;
  }

  async createFirstConfirmationCartTransaction(
    userId: string,
    address: string,
  ) {
    const blockchain = 'litecoin';
    try {
      const options = {
        ...default_options,
        method: 'POST',
        path: `/v2/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-unconfirmed`,
        qs: { context: userId },
      };
      const payload = {
        context: userId,
        data: {
          item: {
            address: address,
            allowDuplicates: false,
            callbackSecretKey: 'a12k*?_1ds',
            callbackUrl: `${this.hostapi}/cryptoapis/callbackCart`,
          },
        },
      };
      const res =
        await cryptoapisRequest<ResponseNewUnconfirmedCoinsTransactions>(
          options,
          payload,
        );
      console.log(JSON.stringify(res));
      return res;
    } catch (err) {
      console.error(JSON.stringify(err));
      return null;
    }
  }

  async createCallbackCartConfirmation(address: string) {
    const blockchain = this.getBlockchainFromCurrency('LTC');
    const options = {
      ...default_options,
      method: 'POST',
      path: `/v2/blockchain-events/${blockchain}/${this.network}/subscriptions/address-coins-transactions-confirmed`,
    };
    return await cryptoapisRequest<ResponseNewConfirmedCoinsTransactions>(
      options,
      {
        data: {
          item: {
            address: address,
            allowDuplicates: 'true',
            callbackSecretKey: 'a12k*?_1ds',
            callbackUrl: `${this.hostapi}/cryptoapis/callbackCart`,
            receiveCallbackOn: 2,
          },
        },
      },
    );
  }
}
