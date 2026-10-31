import { PartialType } from '@nestjs/swagger';
import { CreateQuotationTemplateDto } from './create-quotation-template.dto';

export class UpdateQuotationTemplateDto extends PartialType(
  CreateQuotationTemplateDto,
) {}
