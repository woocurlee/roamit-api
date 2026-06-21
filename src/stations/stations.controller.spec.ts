import { Test, type TestingModule } from '@nestjs/testing';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

const serviceMock = {
  findAll: jest.fn(),
  getRandom: jest.fn(),
};

describe('StationsController', () => {
  let controller: StationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StationsController],
      providers: [{ provide: StationsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<StationsController>(StationsController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('findAll 은 서비스 결과를 그대로 반환한다', async () => {
    const stations = [{ id: '교대', name: '교대', lines: [] }];
    serviceMock.findAll.mockResolvedValue(stations);
    await expect(controller.findAll()).resolves.toBe(stations);
    expect(serviceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('getRandom 은 서비스 결과를 그대로 반환한다', async () => {
    const station = { id: '신림', name: '신림', lines: [] };
    serviceMock.getRandom.mockResolvedValue(station);
    await expect(controller.getRandom()).resolves.toBe(station);
    expect(serviceMock.getRandom).toHaveBeenCalledTimes(1);
  });
});
