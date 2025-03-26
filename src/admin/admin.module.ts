import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CryptoapisService } from '../cryptoapis/cryptoapis.service';
import { BinaryService } from '../binary/binary.service';
import { UsersService } from '../users/users.service';
import { RanksService } from 'src/ranks/ranks.service';
import { GoogletaskService } from '../googletask/googletask.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, CryptoapisService, BinaryService, UsersService, RanksService, GoogletaskService],
})
export class AdminModule {}
