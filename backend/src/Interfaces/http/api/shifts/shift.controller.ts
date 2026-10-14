import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpenShiftUseCase } from '../../../../Applications/use_case/shifts/OpenShiftUseCase';
import { CloseShiftUseCase } from '../../../../Applications/use_case/shifts/CloseShiftUseCase';
import { GetShiftsUseCase } from '../../../../Applications/use_case/shifts/GetShiftsUseCase';
import { JwtAccessPayload } from '../../../../Applications/security/TokenManager';
import { AuthorizationError } from '../../../../Commons/exceptions/AuthorizationError';
import { successResponse, listResponse } from '../../../../Commons/helpers/response.helper';
import { parsePagination } from '../../../../Commons/helpers/pagination.helper';
import { GetUser } from '../../decorators/get-user.decorator';
import { RequirePermission } from '../../decorators/require-permission.decorator';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ShiftQueryDto } from './dto/shift-query.dto';

/**
 * ShiftController — POS cashier shifts (POS / Sales Fase 1, doc 51 §4.2/§6.2/§9/§10).
 * Company-scoped; permission-guarded (open/close = shift.manage, read = shift.read).
 *
 * POST /sales/shifts/open         open a shift (opening cash)
 * POST /sales/shifts/:id/close    close a shift + reconcile cash
 * GET  /sales/shifts              list
 * GET  /sales/shifts/:id          detail
 */
@ApiTags('Shift')
@ApiBearerAuth()
@Controller('sales/shifts')
export class ShiftController {
  constructor(
    private readonly openShiftUseCase: OpenShiftUseCase,
    private readonly closeShiftUseCase: CloseShiftUseCase,
    private readonly getShiftsUseCase: GetShiftsUseCase,
  ) {}

  private _companyId(user: JwtAccessPayload): string {
    if (!user.companyId) {
      throw new AuthorizationError('AUTHORIZATION.NO_COMPANY_CONTEXT');
    }
    return user.companyId;
  }

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('shift.manage')
  @ApiOperation({ summary: 'Open a cashier shift (opening cash)' })
  @ApiResponse({ status: 201, description: 'Shift opened' })
  @ApiResponse({ status: 409, description: 'A shift is already OPEN for this cashier + outlet' })
  async open(@Body() dto: OpenShiftDto, @GetUser() user: JwtAccessPayload) {
    const shift = await this.openShiftUseCase.execute(dto, this._companyId(user), user.sub);
    return successResponse(shift);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('shift.manage')
  @ApiOperation({ summary: 'Close a cashier shift (cash reconciliation)' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift closed; discrepancy computed' })
  @ApiResponse({ status: 400, description: 'Shift already closed or invalid transition' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async close(
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
    @GetUser() user: JwtAccessPayload,
  ) {
    const shift = await this.closeShiftUseCase.execute(id, dto, this._companyId(user), user.sub);
    return successResponse(shift);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('shift.read')
  @ApiOperation({ summary: 'List cashier shifts' })
  @ApiResponse({ status: 200, description: 'Paginated shift list' })
  async list(@Query() query: ShiftQueryDto, @GetUser() user: JwtAccessPayload) {
    const companyId = this._companyId(user);
    const { page, limit, offset } = parsePagination(query);
    const { rows, total } = await this.getShiftsUseCase.list(
      {
        limit,
        offset,
        status: query.status,
        outletId: query.outletId,
        cashierUserId: user.roleCode === 'OWNER' ? query.cashierUserId : user.sub,
      },
      companyId,
    );
    return listResponse(rows, total, page, limit);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('shift.read')
  @ApiOperation({ summary: 'Get a cashier shift by ID' })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({ status: 200, description: 'Shift detail' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async detail(@Param('id') id: string, @GetUser() user: JwtAccessPayload) {
    const shift = await this.getShiftsUseCase.detail(id, this._companyId(user));
    return successResponse(shift);
  }
}
