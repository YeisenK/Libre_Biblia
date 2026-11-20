import { Body, Controller, Delete, Get, HttpCode, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { DeleteUserDto, PatchUserDto, UpdateSettingsDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get() me(@CurrentUser() u: AuthUser) { return this.users.me(u.id); }

  @Patch() patch(@CurrentUser() u: AuthUser, @Body() dto: PatchUserDto) { return this.users.patch(u.id, dto); }

  @Delete() @HttpCode(204)
  async remove(@CurrentUser() u: AuthUser, @Body() dto: DeleteUserDto) { await this.users.remove(u.id, dto.password); }

  @Get('export') export(@CurrentUser() u: AuthUser) { return this.users.export(u.id); }

  @Get('settings') getSettings(@CurrentUser() u: AuthUser) { return this.users.getSettings(u.id); }

  @Put('settings') putSettings(@CurrentUser() u: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.users.putSettings(u.id, dto);
  }
}
