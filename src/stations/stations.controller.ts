import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StationsService } from './stations.service';
import { StationResponseDto } from './dto/station-response.dto';

@ApiTags('stations')
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  /** GET /stations — 전체 역 목록 */
  @Get()
  @ApiOperation({ summary: '전체 역 목록 조회' })
  @ApiOkResponse({ type: [StationResponseDto] })
  findAll(): Promise<StationResponseDto[]> {
    return this.stationsService.findAll();
  }

  /** GET /stations/random — 무작위 역 1개 */
  @Get('random')
  @ApiOperation({ summary: '무작위 역 1개 조회' })
  @ApiOkResponse({ type: StationResponseDto })
  getRandom(): Promise<StationResponseDto> {
    return this.stationsService.getRandom();
  }
}
