import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface BusinessInfo {
  id?: number;
  name: string;
  address?: string | null;
  neighborhood?: string | null;
  city_state?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  branch_number?: number | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

@Injectable()
export class BusinessInfoService {
  constructor(private prisma: PrismaService) {}

  async getBusinessInfo(): Promise<BusinessInfo | null> {
    const info = await this.prisma.business_info.findFirst();
    return info as BusinessInfo | null;
  }

  async updateBusinessInfo(data: Partial<BusinessInfo>): Promise<BusinessInfo> {
    const existing = await this.prisma.business_info.findFirst();
    
    if (existing) {
      const result = await this.prisma.business_info.update({
        where: { id: existing.id },
        data: {
          ...data,
          updated_at: new Date(),
        },
      });
      return result as BusinessInfo;
    } else {
      const result = await this.prisma.business_info.create({
        data: {
          ...data,
          id: undefined,
        },
      });
      return result as BusinessInfo;
    }
  }
}
