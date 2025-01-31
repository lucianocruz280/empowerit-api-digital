import { Injectable } from '@nestjs/common';
import { db as admin } from '../firebase/admin';
import dayjs, { Dayjs } from 'dayjs';
import { Ranks, ranksOrder, ranksPoints, ranks_object } from './ranks_object';
import { GoogletaskService } from '../googletask/googletask.service';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { getBinaryPercent } from '../binary/binary_packs';
import { getMentorPercent } from '../bonds/bonds';

type UserRank = {
  rank?: Ranks;
  order: number;
};

@Injectable()
export class RanksService {
  constructor(private readonly googleTaskService: GoogletaskService) {}

  async updateNewRanks() {
    try {
      const users = await admin
        .collection('users')
        .orderBy('created_at', 'desc')
        .get();

      const promises = users.docs.map(async (doc) => {
        const userRef = await admin.collection('users').doc(doc.id);
        const volumen = await this.getShortLeg(doc.id);
        console.log(doc.id)
        if (Number(volumen) >= 2300000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'top_1',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'top_1',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'top-legend',
            });
          }
        } else if (Number(volumen) >= 600000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'top_diamond',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'top_diamond',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'top_1',
            });
          }
        } else if (Number(volumen) >= 180000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'international_director',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'international_director',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'top_diamond',
            });
          }
        } else if (Number(volumen) >= 72000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'national_director',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'national_director',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'international_director',
            });
          }
        } else if (Number(volumen) >= 35000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'regional_director',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'regional_director',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'national_director',
            });
          }
        } else if (Number(volumen) >= 25000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'master_3500',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'master_3500',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'regional_director',
            });
          }
        } else if (Number(volumen) >= 16000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'master_2500',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'master_2500',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'master_3500',
            });
          }
        } else if (Number(volumen) >= 1200) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'master_2000',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'master_2000',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'master_2500',
            });
          }
        } else if (Number(volumen) >= 8000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'advance_builder',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'advance_builder',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'master_2000',
            });
          }
        } else if (Number(volumen) >= 6000) {
          const left_side = await this.getHasRankBySide(
            doc.id,
            'left',
            'star_builder',
          );
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'star_builder',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'advance_builder',
            });
          }
        } else if (Number(volumen) >= 1500) {
          const left_side = await this.getHasRankBySide(doc.id, 'left', 'none');
          const right_side = await this.getHasRankBySide(
            doc.id,
            'right',
            'none',
          );
          if (left_side && right_side) {
            userRef.update({
              rank: 'star_builder',
            });
          }
        } else if (Number(volumen) >= 500) {
          userRef.update({
            rank: 'initial_builder',
          });
        } else {
          userRef.update({
            rank: 'none',
          });
        }
      });

      await Promise.all(promises);

      return 'exito en la funcion de updateNewRanks';
    } catch (error) {
      console.log('Error en updateNewRanks: ', error);
      return 'error en la funcion de updateNewRanks';
    }
  }

  async getHasRankBySide(user_id: string, side: string, range: string) {
    const sidesRef = await admin
      .collection('users')
      .doc(user_id)
      .collection(`${side}-people`)
      .get();

    for (const doc of sidesRef.docs) {
      const sidesRefUserId = doc.get('user_id');
      const userRef = await admin.collection('users').doc(sidesRefUserId).get();
      const userRank = userRef.get('rank');
      if (userRank == range) {
        return true;
      }
    }
    return false;
  }

  async getShortLeg(user_id: string) {
    const pointsRef = await admin
      .collection('users')
      .doc(user_id)
      .collection('points');

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let leftPoints = 0;
    let rightPoints = 0;

    try {
      const volumen = pointsRef
        .where('created_at', '>=', firstDayOfMonth)
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.side == 'left') {
              leftPoints += data.points;
            }
            if (data.side == 'right') {
              rightPoints += data.points;
            }
          });
          return rightPoints >= leftPoints ? leftPoints : rightPoints;
        })
        .catch((error) => {
          console.log('Error getting documents: ', error);
        });
      return volumen;
    } catch (error) {
      console.log('Error en sacando los puntos de rango', error);
      return null;
    }
  }

  async updateRank() {
    /* Obtener todos los usuraios */
    const users = await admin
      .collection('users')
      .orderBy('created_at', 'desc')
      .get();

    await Promise.all(
      users.docs.map(async (user) => {
        type Method = 'POST';
        const task: google.cloud.tasks.v2.ITask = {
          httpRequest: {
            httpMethod: 'POST' as Method,
            url: `${process.env.API_URL}/ranks/updateUserRank/${user.id}`,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        };

        await this.googleTaskService.addToQueue(
          task,
          this.googleTaskService.getPathQueue('user-rank'),
        );
      }),
    );

    console.log(users.size, 'usuarios');

    return 'OK';
  }

  async registerHistoryUserRank(
    year: number,
    month: number,
    userId: string,
    rank: UserRank,
  ) {
    const user = await admin.collection('users').doc(userId).get();
    const past_max_rank: UserRank = user.get('max_rank')
      ? ranks_object[user.get('max_rank')]
      : ranks_object.none;
    /**
     * Is true when max_rank is lower than new rank
     */
    const is_new_max_rank = past_max_rank.order < rank.order;

    await admin.collection('ranks').doc(`${year}-${month}`).set({
      created_at: new Date(),
    });
    await admin
      .collection('ranks')
      .doc(`${year}-${month}`)
      .collection('users')
      .doc(userId)
      .set({
        past_max_rank: past_max_rank,
        current_rank: rank,
        new_max_rank: is_new_max_rank ? past_max_rank : rank,
        new_rank: is_new_max_rank,
      });

    if (is_new_max_rank) {
      await admin
        .collection('users')
        .doc(userId)
        .collection('rank-promotion')
        .add({
          created_at: new Date(),
          rank: rank.rank || Ranks.INITIAL_BUILD,
        });
      await admin.collection('rank-promotion').add({
        id_user: userId,
        name: user.get('name') || '',
        created_at: new Date(),
        rank: rank.rank || Ranks.INITIAL_BUILD,
      });
    }
  }

  async updateUserRank(id_user: string) {
    const user = await admin.collection('users').doc(id_user).get();
    const rankData = await this.getRankUser(id_user);

    const start = dayjs().add(-1, 'day').utcOffset(-6).startOf('month');
    const end = dayjs().add(-1, 'day').utcOffset(-6).endOf('month');

    const points = await this.getPoints(id_user, start, end);

    await this.registerHistoryUserRank(
      start.year(),
      start.month(),
      id_user,
      rankData,
    );

    await this.insertRank(
      id_user,
      rankData.rank,
      start.year(),
      start.month(),
      points.left,
      points.right,
    );

    /**
     * Guardar rango corte
     */
    await admin.collection('users').doc(id_user).update({
      rank: rankData.rank,
    });

    /**
     * Guardar maximo rango
     */
    if (!user.get('max_rank')) {
      await admin.collection('users').doc(id_user).update({
        max_rank: rankData.rank,
      });
    } else {
      const orderPastMaxRank = ranksOrder.findIndex(
        (r) => r == user.get('max_rank'),
      );
      const orderNewRank = ranksOrder.findIndex((r) => r == rankData.rank);
      if (orderNewRank > orderPastMaxRank) {
        await admin.collection('users').doc(id_user).update({
          max_rank: rankData.rank,
        });
      }
    }

    return rankData;
  }

  async getRankUser(userId: string): Promise<any> {
    const start = dayjs().add(-1, 'day').utcOffset(-6).startOf('month');
    const end = dayjs().add(-1, 'day').utcOffset(-6).endOf('month');

    /* Obtener la suma de puntos del ultimo mes */
    const points = await this.getPoints(userId, start, end);

    /* Crear subcoleccion para el historial de rangos */
    const smaller_leg = points.right > points.left ? 'left' : 'right';
    const points_smaller_leg = points[smaller_leg];
    const rank = await this.getRank(userId, points_smaller_leg);

    return {
      order: rank.order,
      rank: rank.rank,
      left_points: points.left,
      right_points: points.right,
    };
  }

  async getPoints(
    userId: string,
    start: Dayjs,
    end: Dayjs,
  ): Promise<{ left: number; right: number }> {
    const points = await admin
      .collection('users')
      .doc(userId)
      .collection('points')
      .where('created_at', '>=', start.toDate())
      .where('created_at', '<=', end.toDate())
      .get()
      .then((r) => r.docs.map((d) => d.data()));

    const sumSidePoints =
      (side: 'left' | 'right') =>
      (a: number, b: { side: 'left' | 'right'; points: number }): number => {
        return a + (b.side == side ? b.points : 0);
      };

    const left_points = points.reduce(sumSidePoints('left'), 0);
    const right_points = points.reduce(sumSidePoints('right'), 0);

    return {
      left: left_points,
      right: right_points,
    };
  }

  async getRank(
    userId: string,
    points_smaller_leg: number,
  ): Promise<{
    rank: Ranks;
    missing_points: number;
    points_smaller_leg: number;
    next_rank: Ranks;
    order: number;
  }> {
    let rank: Ranks = Ranks.NONE;
    let next_rank: Ranks = Ranks.NONE;
    let missing_points = 0;

    const hasRankBothSides = async (rank: Ranks): Promise<boolean> => {
      return (
        (await this.getUserRankBySide(userId, rank, 'left')) &&
        (await this.getUserRankBySide(userId, rank, 'right'))
      );
    };

    if (
      points_smaller_leg >= ranksPoints[Ranks.TOP_LEGEND] &&
      (await hasRankBothSides(Ranks.TOP_1))
    ) {
      rank = Ranks.TOP_LEGEND;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.TOP_1] &&
      (await hasRankBothSides(Ranks.TOP_DIAMOND))
    ) {
      rank = Ranks.TOP_1;
      missing_points = ranksPoints[Ranks.TOP_LEGEND] - points_smaller_leg;
      next_rank = Ranks.TOP_LEGEND;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.TOP_DIAMOND] &&
      (await hasRankBothSides(Ranks.INTERNATIONAL_DIRECTOR))
    ) {
      rank = Ranks.TOP_DIAMOND;
      next_rank = Ranks.TOP_1;
      missing_points = ranksPoints[Ranks.TOP_1] - points_smaller_leg;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.INTERNATIONAL_DIRECTOR] &&
      (await hasRankBothSides(Ranks.NATIONAL_DIRECTOR))
    ) {
      rank = Ranks.INTERNATIONAL_DIRECTOR;
      missing_points = ranksPoints[Ranks.TOP_DIAMOND] - points_smaller_leg;
      next_rank = Ranks.TOP_DIAMOND;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.NATIONAL_DIRECTOR] &&
      (await hasRankBothSides(Ranks.REGIONAL_DIRECTOR))
    ) {
      rank = Ranks.NATIONAL_DIRECTOR;
      missing_points =
        ranksPoints[Ranks.INTERNATIONAL_DIRECTOR] - points_smaller_leg;
      next_rank = Ranks.INTERNATIONAL_DIRECTOR;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.REGIONAL_DIRECTOR] &&
      (await hasRankBothSides(Ranks.MASTER_2500))
    ) {
      rank = Ranks.REGIONAL_DIRECTOR;
      missing_points =
        ranksPoints[Ranks.NATIONAL_DIRECTOR] - points_smaller_leg;
      next_rank = Ranks.NATIONAL_DIRECTOR;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.MASTER_2500] &&
      (await hasRankBothSides(Ranks.MASTER_1500))
    ) {
      rank = Ranks.MASTER_2500;
      missing_points =
        ranksPoints[Ranks.REGIONAL_DIRECTOR] - points_smaller_leg;
      next_rank = Ranks.REGIONAL_DIRECTOR;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.MASTER_1500] &&
      (await hasRankBothSides(Ranks.MASTER_1000))
    ) {
      rank = Ranks.MASTER_1500;
      missing_points = ranksPoints[Ranks.MASTER_2500] - points_smaller_leg;
      next_rank = Ranks.MASTER_2500;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.MASTER_1000] &&
      (await hasRankBothSides(Ranks.ADVANCED_BUILDER))
    ) {
      rank = Ranks.MASTER_1000;
      missing_points = ranksPoints[Ranks.MASTER_2500] - points_smaller_leg;
      next_rank = Ranks.MASTER_2500;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.ADVANCED_BUILDER] &&
      (await hasRankBothSides(Ranks.STAR_BUILD))
    ) {
      rank = Ranks.ADVANCED_BUILDER;
      missing_points = ranksPoints[Ranks.MASTER_1000] - points_smaller_leg;
      next_rank = Ranks.MASTER_1000;
    } else if (
      points_smaller_leg >= ranksPoints[Ranks.STAR_BUILD] &&
      (await hasRankBothSides(Ranks.INITIAL_BUILD))
    ) {
      rank = Ranks.STAR_BUILD;
      missing_points = ranksPoints[Ranks.ADVANCED_BUILDER] - points_smaller_leg;
      next_rank = Ranks.ADVANCED_BUILDER;
    } else if (points_smaller_leg >= ranksPoints[Ranks.INITIAL_BUILD]) {
      rank = Ranks.INITIAL_BUILD;
      missing_points = ranksPoints[Ranks.STAR_BUILD] - points_smaller_leg;
      next_rank = Ranks.STAR_BUILD;
    } else {
      rank = Ranks.NONE;
      missing_points = ranksPoints[Ranks.INITIAL_BUILD] - points_smaller_leg;
      next_rank = Ranks.INITIAL_BUILD;
    }

    const order = ranksOrder.findIndex((r) => r == rank);

    return {
      rank,
      missing_points,
      points_smaller_leg,
      next_rank,
      order: order ?? -1,
    };
  }

  async getUserRankBySide(
    userId: string,
    rankNeeded: string,
    side: 'left' | 'right',
  ) {
    const users_points = await admin
      .collection('users')
      .doc(userId)
      .collection(`${side}-people`)
      .orderBy('created_at', 'desc')
      .get();

    for (const doc of users_points.docs) {
      const rank = await this.getRankUser(doc.id);
      if (rankNeeded == rank.rank) {
        return true;
      }
    }

    return false;
  }

  async insertRank(
    userId: string,
    rank: string,
    year: number,
    month: number,
    left_points: number,
    right_points: number,
  ) {
    try {
      await admin
        .collection('users')
        .doc(userId)
        .collection('rank_history')
        .doc(`${year}-${month}`)
        .set({
          rank,
          left_points,
          right_points,
        });
    } catch (error) {
      console.error('Error al agregar documento:', error);
    }
  }

  async getRankKey(id_user: string, rank_key: string) {
    const user = await admin.collection('users').doc(id_user).get();
    const current = ranks_object[rank_key];
    const next_rank = ranks_object[ranksOrder[current.order + 1]];
    return {
      ...current,
      next_rank,
      binary_percent: getBinaryPercent(user.id, user.get('membership')),
      mentor_percent: getMentorPercent(user.id, user.get('membership')),
    };
  }

  async newRanks(
    year: string,
    week: string,
    returnType: 'csv' | 'json' = 'json',
  ) {
    const prevWeek = (Number(week) - 1).toString();

    const usersPrev = await admin
      .collection('ranks')
      .doc(`${year}-${prevWeek}`)
      .collection('users')
      .get();

    const usersNew = await admin
      .collection('ranks')
      .doc(`${year}-${week}`)
      .collection('users')
      .get();

    const response = [];

    for (const newRank of usersNew.docs) {
      if (
        !['vanguard', 'scholarship'].includes(newRank.get('new_max_rank.key'))
      ) {
        const pastRank = usersPrev.docs.find((r) => r.id == newRank.id);

        if (
          pastRank.get('new_max_rank.key') != newRank.get('new_max_rank.key')
        ) {
          const user = await admin.collection('users').doc(newRank.id).get();
          const sponsor = await admin
            .collection('users')
            .doc(user.get('sponsor_id'))
            .get();
          response.push({
            past_rank: pastRank.get('new_max_rank.display'),
            new_rank: newRank.get('new_max_rank.display'),
            name: user.get('name'),
            email: user.get('email'),
            id: user.id,
            sponsor: sponsor.get('name'),
            sponsor_email: sponsor.get('email'),
          });
        }
      }
    }

    return returnType == 'json'
      ? response
      : [
          'ID,NOMBRE,EMAIL,PATROCINADOR,PATROCINADOR EMAIL,RANGO PASADO,NUEVO RANGO',
          ...response.map((r) =>
            [
              r.id,
              r.name,
              r.email,
              r.sponsor,
              r.sponsor_email,
              r.past_rank,
              r.new_rank,
            ].join(','),
          ),
        ].join('\n');
  }
}
