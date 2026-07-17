import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { UpdateCustomizationDto } from './dto/update-customization.dto';

@Injectable()
export class CustomizationService {
  private readonly logger = new Logger(CustomizationService.name);
  private readonly filePath = path.resolve(process.cwd(), 'src/customization/customization.json');

  private readonly defaults = {
    heroBadge: "AVAILABLE NOW",
    heroTitle: "FALL /\nWINTER\nDROP 01",
    heroSubtitle: "Decentralized inventory. Proof of authenticity for every thread.",
    heroButtonText: "Shop Latest Drop",
    highlightsTitle: "Newly Released",
    highlightsSubtitle: "Explore our latest limited edition pieces.",
    newsletterTitle: "Stay in the loop",
    newsletterSubtitle: "Join our decentralized mailing list. Get early access to drops and real-time inventory verification alerts.",
    aboutHeroBadge: "Our Philosophy",
    aboutHeroTitle: "Defining Modern Luxury",
    aboutHeroSubtitle: "We craft premium streetwear with provenance and purpose — responsibly built, intentionally designed, and verifiably authentic.",
    brandStatementBadge: "Brand Statement",
    brandStatementTitle: "A new standard in streetwear",
    brandStatementDescription: "Since day one we've been rethinking how clothing is made and owned: from design and material sourcing to transparent supply chains and authenticated ownership. Every piece is engineered to last and to tell a story."
  };

  getCustomization() {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(this.filePath, JSON.stringify(this.defaults, null, 2), 'utf8');
        return this.defaults;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      this.logger.error('Failed to read customization file, returning defaults', error);
      return this.defaults;
    }
  }

  updateCustomization(dto: UpdateCustomizationDto) {
    try {
      const current = this.getCustomization();
      const updated = { ...current, ...dto };
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(updated, null, 2), 'utf8');
      return updated;
    } catch (error) {
      this.logger.error('Failed to write customization file', error);
      throw error;
    }
  }
}
