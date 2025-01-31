import { Controller, Get, Param } from '@nestjs/common';
import { AlgorithmMrRangeService } from './algorithm-mr-range.service';

@Controller('algorithm-mr-range')
export class AlgorithmMrRangeController {
  constructor(private readonly algorithmService: AlgorithmMrRangeService) {}
  
  @Get('getAllLicenses')
  async getAllLicenses(){
    return this.algorithmService.updateEmail()
  }

  @Get(':licenseId')
  testing(@Param('licenseId') licenseId: string) {
    return this.algorithmService.isAvailableLicenseById(licenseId);
  }

}
