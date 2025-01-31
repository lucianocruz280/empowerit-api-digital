import { Body, Controller, Post } from '@nestjs/common';
import { ParticipationsService } from './participations.service';

@Controller('participations')
export class ParticipationsController {
  constructor(private readonly participationsService: ParticipationsService) {}

  @Post('activateWithoutVolumen')
  async activateParticipationWithouthVolumen(@Body() body) {
    return await this.participationsService.activateWithoutVolumen(body);
  }

  @Post('activateWithVolumen')
  async activateParticipationWithVolumen(@Body() body) {
    return await this.participationsService.activateWithVolumen(body);
  }
  @Post('payrollRequest')
  async payrollRequest() {
    return await this.participationsService.payrollRequest();
  }
}
