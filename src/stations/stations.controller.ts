import { Controller, Get } from '@nestjs/common';
import { StationsService } from './stations.service';
import { StationResponseDto } from './dto/station-response.dto';

@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  /** GET /stations — 전체 역 목록 */
  @Get()
  findAll(): Promise<StationResponseDto[]> {
    return this.stationsService.findAll();
  }

  /** GET /stations/random — 무작위 역 1개 */
  @Get('random')
  getRandom(): Promise<StationResponseDto> {
    return this.stationsService.getRandom();
  }
}
