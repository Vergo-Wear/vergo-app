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
    brandStatementDescription: "Since day one we've been rethinking how clothing is made and owned: from design and material sourcing to transparent supply chains and authenticated ownership. Every piece is engineered to last and to tell a story.",
    brandFoundingYear: "2024",
    brandOrigin: "Colombo, Sri Lanka",
    brandMissionTitle: "OUR ATELIER MISSION",
    brandMissionDescription: "VERGO was established with a singular obsession: to eliminate disposable fashion culture. Every silhouette is designed from scratch, custom knitted with heavy 280 GSM combed cotton yarn, and verified individually so collectors know exactly what they hold.",
    ownerBadge: "CREATIVE DIRECTION & LEADERSHIP",
    ownerTitle: "THE VISION BEHIND VERGO",
    ownerSubtitle: "Bridging architectural brutalism with elevated Sri Lankan textile craftsmanship.",
    ownerName: "FOUNDER & ATELIER LEAD",
    ownerRole: "Creative Director & Founder",
    ownerBio: "Founded in Colombo, VERGO began as an experimental textile studio committed to producing uncompromising streetwear. Rejecting fast production and generic blanks, our creative direction prioritizes heavy draping, archival durability, and transparent small-batch production that elevates South Asian streetwear on the global stage.",
    ownerQuote: "\"Streetwear is not merely graphic application on fabric; it is structural architecture you live inside. We build garments that outlive seasonal hype.\"",
    ownerImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    bankName: "VERGO SL - CENTRAL BANK",
    bankBranch: "Main Branch",
    bankAccountName: "VERGO ATELIER PVT LTD",
    bankAccountNumber: "1234 - 5678 - 9012",
    ads: [
      {
        id: "ad-1",
        title: "SEASON ARCHIVE DROP",
        badge: "FEATURED CAMPAIGN",
        description: "Explore the new architectural silhouettes engineered with 280 GSM heavyweight cotton.",
        type: "image",
        mediaUrl: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg",
        destinationUrl: "/collection",
        ctaText: "EXPLORE COLLECTION",
        isActive: true,
        placement: "home_spotlight",
        createdAt: "2026-10-01T00:00:00.000Z"
      }
    ],
    featuredFeedbacks: [
      {
        id: "737443d1-51c6-436a-81d5-aa640068e786",
        name: "Pamuda U.",
        location: "Colombo",
        verified: true,
        garment: "Vergo Heavyweight Tee (Jet Black - Size L)",
        rating: 5,
        date: "Verified Drop",
        comment: "The drape on this 280 GSM tee is genuinely unmatched in Sri Lanka. It holds its boxy structure throughout the day without clinging or stretching at the collar. Best streetwear purchase this year.",
        showOnHome: true
      },
      {
        id: "fb-2",
        name: "Aakash R.",
        location: "Kandy",
        verified: true,
        garment: "Vergo Heavyweight Tee (Crimson Red - Size XL)",
        rating: 5,
        date: "Verified Drop",
        comment: "Delivery via Citypak arrived in less than 36 hours. The packaging and unboxing feel like a luxury boutique drop. The high-density branding and heavy cotton weight are 10/10.",
        showOnHome: true
      },
      {
        id: "fb-3",
        name: "Dinuka M.",
        location: "Galle",
        verified: true,
        garment: "Vergo Archival Tee (Desert Sage - Size M)",
        rating: 5,
        date: "Verified Drop",
        comment: "Washed it twice already and zero shrinkage or collar distortion. True dropped-shoulder cut that fits like luxury overseas streetwear brands. Already waiting for the hoodie drop.",
        showOnHome: true
      }
    ],
    standardBadge: "THE VERGO STANDARD",
    standardTitle: "ENGINEERED FOR LONGEVITY.",
    standardSubtitle: "Heavyweight construction, reinforced tension points, and authentic materials.",
    standardFeatures: [
      {
        number: "01",
        tag: "CUSTOM DENSE WEAVE",
        title: "280 GSM Luxury Combed Cotton",
        description: "Structured heavyweight drape that holds shape wash after wash."
      },
      {
        number: "02",
        tag: "ARCHIVAL TAILORING",
        title: "Reinforced Micro-Rib Collar",
        description: "Double-needle neckband binding for zero collar stretching."
      },
      {
        number: "03",
        tag: "DECENTRALIZED PROOF",
        title: "100% Verified Authenticity",
        description: "Cryptographic ledger verification on every individual SKU."
      },
      {
        number: "04",
        tag: "CITYPAK LOGISTICS",
        title: "Express Nationwide Dispatch",
        description: "24–48h courier delivery via Citypak with live SMS tracking."
      }
    ],
    feedbackBadge: "VERIFIED COMMUNITY",
    feedbackTitle: "TESTED ON THE STREETS.",
    feedbackSubtitle: "Authentic feedback from verified collectors across the island.",
    aboutCollectionsBadge: "CURATED DISCIPLINES",
    aboutCollectionsTitle: "SIGNATURE COLLECTIONS",
    aboutCollections: [
      {
        label: "DROP 01 — SIGNATURE",
        title: "Heavyweight Oversized",
        subtitle: "280 GSM luxury combed cotton with architectural boxy drape.",
        image: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961897/products/lcut7pw9spodo8eqc4ow.jpg",
        link: "/collection"
      },
      {
        label: "ESSENTIAL ARCHIVE",
        title: "Minimalist Monochrome",
        subtitle: "Deep black pigment dye with reinforced anti-stretch ribbing.",
        image: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961605/products/rjapb6vhg3wedif6jwbz.jpg",
        link: "/collection"
      },
      {
        label: "LABS SERIES",
        title: "Decentralized Originals",
        subtitle: "Cryptographically logged serial verification on every garment.",
        image: "https://res.cloudinary.com/aql7sojg/image/upload/v1788961916/products/k5cwxe5syiy2nxfncbls.jpg",
        link: "/collection"
      }
    ],
    whatsappNumber: "+94771234567"
  };

  getCustomization() {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(this.filePath, JSON.stringify(this.defaults, null, 2), 'utf8');
        return this.defaults;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return { ...this.defaults, ...JSON.parse(raw) };
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

  async subscribeNewsletter(email: string) {
    if (!email || !email.includes('@')) {
      return { status: 'error', message: 'Please provide a valid email address.' };
    }

    const normalized = email.trim().toLowerCase();
    const subscribersPath = path.resolve(process.cwd(), 'src/customization/subscribers.json');

    let subscribers: Array<{ email: string; subscribedAt: string }> = [];
    try {
      if (fs.existsSync(subscribersPath)) {
        const raw = fs.readFileSync(subscribersPath, 'utf8');
        subscribers = JSON.parse(raw);
      }
    } catch (err) {
      this.logger.error('Error reading subscribers file:', err);
    }

    const exists = subscribers.some(s => s.email.toLowerCase() === normalized);
    if (exists) {
      return {
        status: 'already_subscribed',
        message: 'This email is already registered on our customer list.',
      };
    }

    // Save locally
    subscribers.push({ email: normalized, subscribedAt: new Date().toISOString() });
    try {
      fs.mkdirSync(path.dirname(subscribersPath), { recursive: true });
      fs.writeFileSync(subscribersPath, JSON.stringify(subscribers, null, 2), 'utf8');
    } catch (err) {
      this.logger.error('Error saving subscriber locally:', err);
    }

    // Submit to Google Form
    try {
      const formUrl =
        process.env.GOOGLE_FORM_NEWSLETTER_URL ||
        'https://docs.google.com/forms/d/e/1FAIpQLScF53RVDt07H3U9TJKbpzKsW8fVLxS9jL2h14ihgO-YB3TtCg/formResponse';
      const entryKey = process.env.GOOGLE_FORM_ENTRY_NEWSLETTER_EMAIL || 'entry.2064532578';
      const body = new URLSearchParams();
      body.append(entryKey, normalized);

      await fetch(formUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      this.logger.log(`Successfully added email ${normalized} to Google Form / Sheet.`);
    } catch (err) {
      this.logger.error('Error submitting email to Google Form:', err);
    }

    return {
      status: 'success',
      message: 'You have been added to our customer list!',
    };
  }
}
