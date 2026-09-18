import { LocationPoint } from '../types';

export interface BangladeshDistrict {
  id: string;
  name: string;
  bnName: string;
  aliases?: string[];
  division: string;
  lat: number;
  lon: number;
}

// All 64 official administrative districts of Bangladesh
export const BANGLADESH_DISTRICTS: BangladeshDistrict[] = [
  // Dhaka Division (13)
  { id: 'dhaka', name: 'Dhaka', bnName: 'ঢাকা', division: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  { id: 'gazipur', name: 'Gazipur', bnName: 'গাজীপুর', division: 'Dhaka', lat: 23.9999, lon: 90.4203 },
  { id: 'narayanganj', name: 'Narayanganj', bnName: 'নারায়ণগঞ্জ', division: 'Dhaka', lat: 23.6238, lon: 90.5000 },
  { id: 'tangail', name: 'Tangail', bnName: 'টাঙ্গাইল', division: 'Dhaka', lat: 24.2513, lon: 89.9167 },
  { id: 'faridpur', name: 'Faridpur', bnName: 'ফরিদপুর', division: 'Dhaka', lat: 23.6071, lon: 89.8429 },
  { id: 'manikganj', name: 'Manikganj', bnName: 'মানিকগঞ্জ', division: 'Dhaka', lat: 23.8617, lon: 90.0003 },
  { id: 'munshiganj', name: 'Munshiganj', bnName: 'মুন্সীগঞ্জ', division: 'Dhaka', lat: 23.5422, lon: 90.5305 },
  { id: 'narsingdi', name: 'Narsingdi', bnName: 'নরসিংদী', division: 'Dhaka', lat: 23.9193, lon: 90.7202 },
  { id: 'gopalganj', name: 'Gopalganj', bnName: 'গোপালগঞ্জ', division: 'Dhaka', lat: 23.0051, lon: 89.8266 },
  { id: 'kishoreganj', name: 'Kishoreganj', bnName: 'কিশোরগঞ্জ', division: 'Dhaka', lat: 24.4449, lon: 90.7766 },
  { id: 'madaripur', name: 'Madaripur', bnName: 'মাদারীপুর', division: 'Dhaka', lat: 23.1641, lon: 90.1897 },
  { id: 'rajbari', name: 'Rajbari', bnName: 'রাজবাড়ী', division: 'Dhaka', lat: 23.7574, lon: 89.6445 },
  { id: 'shariatpur', name: 'Shariatpur', bnName: 'শরীয়তপুর', division: 'Dhaka', lat: 23.2423, lon: 90.3497 },

  // Chattogram Division (11)
  { id: 'chattogram', name: 'Chattogram', bnName: 'চট্টগ্রাম', aliases: ['Chittagong'], division: 'Chattogram', lat: 22.3569, lon: 91.7832 },
  { id: 'coxsbazar', name: "Cox's Bazar", bnName: 'কক্সবাজার', aliases: ['Coxs Bazar', "Cox's Bazaar", 'Coxsbazar'], division: 'Chattogram', lat: 21.4272, lon: 92.0058 },
  { id: 'cumilla', name: 'Cumilla', bnName: 'কুমিল্লা', aliases: ['Comilla'], division: 'Chattogram', lat: 23.4682, lon: 91.1788 },
  { id: 'feni', name: 'Feni', bnName: 'ফেনী', division: 'Chattogram', lat: 23.0159, lon: 91.3976 },
  { id: 'brahmanbaria', name: 'Brahmanbaria', bnName: 'ব্রাহ্মণবাড়িয়া', aliases: ['B-Baria', 'Brahman Baria'], division: 'Chattogram', lat: 23.9571, lon: 91.1119 },
  { id: 'chandpur', name: 'Chandpur', bnName: 'চাঁদপুর', division: 'Chattogram', lat: 23.2333, lon: 90.6667 },
  { id: 'noakhali', name: 'Noakhali', bnName: 'নোয়াখালী', division: 'Chattogram', lat: 22.8696, lon: 91.0994 },
  { id: 'lakshmipur', name: 'Lakshmipur', bnName: 'লক্ষ্মীপুর', aliases: ['Laxmipur'], division: 'Chattogram', lat: 22.9425, lon: 90.8412 },
  { id: 'bandarban', name: 'Bandarban', bnName: 'বান্দরবান', division: 'Chattogram', lat: 22.1953, lon: 92.2184 },
  { id: 'khagrachhari', name: 'Khagrachhari', bnName: 'খাগড়াছড়ি', aliases: ['Khagrachari'], division: 'Chattogram', lat: 23.1193, lon: 91.9847 },
  { id: 'rangamati', name: 'Rangamati', bnName: 'রাঙ্গামাটি', division: 'Chattogram', lat: 22.7324, lon: 92.2985 },

  // Rajshahi Division (8)
  { id: 'rajshahi', name: 'Rajshahi', bnName: 'রাজশাহী', division: 'Rajshahi', lat: 24.3636, lon: 88.6241 },
  { id: 'bogura', name: 'Bogura', bnName: 'বগুড়া', aliases: ['Bogra'], division: 'Rajshahi', lat: 24.8465, lon: 89.3777 },
  { id: 'pabna', name: 'Pabna', bnName: 'পাবনা', division: 'Rajshahi', lat: 24.0064, lon: 89.2372 },
  { id: 'sirajganj', name: 'Sirajganj', bnName: 'সিরাজগঞ্জ', division: 'Rajshahi', lat: 24.4534, lon: 89.7006 },
  { id: 'natore', name: 'Natore', bnName: 'নাটোর', division: 'Rajshahi', lat: 24.4206, lon: 88.9320 },
  { id: 'naogaon', name: 'Naogaon', bnName: 'নওগাঁ', division: 'Rajshahi', lat: 24.7937, lon: 88.9318 },
  { id: 'joypurhat', name: 'Joypurhat', bnName: 'জয়পুরহাট', division: 'Rajshahi', lat: 25.1015, lon: 89.0277 },
  { id: 'chapainawabganj', name: 'Chapainawabganj', bnName: 'চাঁপাইনবাবগঞ্জ', aliases: ['Nawabganj', 'Chapai Nawabganj'], division: 'Rajshahi', lat: 24.5965, lon: 88.2775 },

  // Khulna Division (10)
  { id: 'khulna', name: 'Khulna', bnName: 'খুলনা', division: 'Khulna', lat: 22.8456, lon: 89.5403 },
  { id: 'jashore', name: 'Jashore', bnName: 'যশোর', aliases: ['Jessore'], division: 'Khulna', lat: 23.1664, lon: 89.2081 },
  { id: 'kushtia', name: 'Kushtia', bnName: 'কুষ্টিয়া', division: 'Khulna', lat: 23.9013, lon: 89.1205 },
  { id: 'satkhira', name: 'Satkhira', bnName: 'সাতক্ষীরা', division: 'Khulna', lat: 22.7185, lon: 89.0705 },
  { id: 'bagerhat', name: 'Bagerhat', bnName: 'বাগেরহাট', division: 'Khulna', lat: 22.6516, lon: 89.7859 },
  { id: 'jhenaidah', name: 'Jhenaidah', bnName: 'ঝিনাইদহ', division: 'Khulna', lat: 23.5448, lon: 89.1539 },
  { id: 'chuadanga', name: 'Chuadanga', bnName: 'চুয়াডাঙ্গা', division: 'Khulna', lat: 23.6402, lon: 88.8418 },
  { id: 'magura', name: 'Magura', bnName: 'মাগুরা', division: 'Khulna', lat: 23.4873, lon: 89.4198 },
  { id: 'meherpur', name: 'Meherpur', bnName: 'মেহেরপুর', division: 'Khulna', lat: 23.7622, lon: 88.6318 },
  { id: 'narail', name: 'Narail', bnName: 'নড়াইল', division: 'Khulna', lat: 23.1725, lon: 89.5127 },

  // Barishal Division (6)
  { id: 'barishal', name: 'Barishal', bnName: 'বরিশাল', aliases: ['Barisal'], division: 'Barishal', lat: 22.7010, lon: 90.3535 },
  { id: 'bhola', name: 'Bhola', bnName: 'ভোলা', division: 'Barishal', lat: 22.6859, lon: 90.6482 },
  { id: 'patuakhali', name: 'Patuakhali', bnName: 'পটুয়াখালী', division: 'Barishal', lat: 22.3596, lon: 90.3299 },
  { id: 'pirojpur', name: 'Pirojpur', bnName: 'পিরোজপুর', division: 'Barishal', lat: 22.5841, lon: 89.9720 },
  { id: 'barguna', name: 'Barguna', bnName: 'বরগুনা', division: 'Barishal', lat: 22.0953, lon: 90.1121 },
  { id: 'jhalokati', name: 'Jhalokati', bnName: 'ঝালকাঠি', aliases: ['Jhalakati'], division: 'Barishal', lat: 22.6406, lon: 90.1987 },

  // Sylhet Division (4)
  { id: 'sylhet', name: 'Sylhet', bnName: 'সিলেট', division: 'Sylhet', lat: 24.8949, lon: 91.8687 },
  { id: 'moulvibazar', name: 'Moulvibazar', bnName: 'মৌলভীবাজার', aliases: ['Maulvibazar', 'Moulvi Bazar'], division: 'Sylhet', lat: 24.4829, lon: 91.7774 },
  { id: 'habiganj', name: 'Habiganj', bnName: 'হবিগঞ্জ', division: 'Sylhet', lat: 24.3749, lon: 91.4155 },
  { id: 'sunamganj', name: 'Sunamganj', bnName: 'সুনামগঞ্জ', division: 'Sylhet', lat: 25.0658, lon: 91.3950 },

  // Rangpur Division (8)
  { id: 'rangpur', name: 'Rangpur', bnName: 'রংপুর', division: 'Rangpur', lat: 25.7439, lon: 89.2752 },
  { id: 'dinajpur', name: 'Dinajpur', bnName: 'দিনাজপুর', division: 'Rangpur', lat: 25.6217, lon: 88.6355 },
  { id: 'kurigram', name: 'Kurigram', bnName: 'কুড়িগ্রাম', division: 'Rangpur', lat: 25.8054, lon: 89.6362 },
  { id: 'gaibandha', name: 'Gaibandha', bnName: 'গাইবান্ধা', division: 'Rangpur', lat: 25.3288, lon: 89.5430 },
  { id: 'nilphamari', name: 'Nilphamari', bnName: 'নীলফামারী', division: 'Rangpur', lat: 25.9318, lon: 88.8560 },
  { id: 'panchagarh', name: 'Panchagarh', bnName: 'পঞ্চগড়', division: 'Rangpur', lat: 26.3411, lon: 88.5542 },
  { id: 'thakurgaon', name: 'Thakurgaon', bnName: 'ঠাকুরগাঁও', division: 'Rangpur', lat: 26.0337, lon: 88.4617 },
  { id: 'lalmonirhat', name: 'Lalmonirhat', bnName: 'লালমনিরহাট', division: 'Rangpur', lat: 25.9923, lon: 89.2847 },

  // Mymensingh Division (4)
  { id: 'mymensingh', name: 'Mymensingh', bnName: 'ময়মনসিংহ', division: 'Mymensingh', lat: 24.7471, lon: 90.4203 },
  { id: 'jamalpur', name: 'Jamalpur', bnName: 'জামালপুর', division: 'Mymensingh', lat: 24.9375, lon: 89.9378 },
  { id: 'netrokona', name: 'Netrokona', bnName: 'নেত্রকোণা', aliases: ['Netrakona'], division: 'Mymensingh', lat: 24.8709, lon: 90.7279 },
  { id: 'sherpur', name: 'Sherpur', bnName: 'শেরপুর', division: 'Mymensingh', lat: 25.0205, lon: 90.0153 },
];

export const BANGLADESH_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Chittagong',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Barisal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

// Coordinate bounding box for Bangladesh
export const BD_BOUNDS = {
  minLat: 20.30,
  maxLat: 26.75,
  minLon: 88.00,
  maxLon: 92.75,
};

// Set of lowercase district and division keywords for fast matching
const DISTRICT_KEYWORDS = new Set<string>();
BANGLADESH_DISTRICTS.forEach((d) => {
  DISTRICT_KEYWORDS.add(d.name.toLowerCase());
  DISTRICT_KEYWORDS.add(d.bnName.toLowerCase());
  if (d.aliases) {
    d.aliases.forEach((a) => DISTRICT_KEYWORDS.add(a.toLowerCase()));
  }
});
BANGLADESH_DIVISIONS.forEach((div) => DISTRICT_KEYWORDS.add(div.toLowerCase()));

/**
 * Validates if a location or text belongs strictly to Bangladesh
 */
export function isLocationInBangladesh(item: {
  lat?: number;
  lon?: number;
  country?: string;
  country_code?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  county?: string;
  state_district?: string;
}): boolean {
  // If country_code is present and not 'bd', it is strictly NOT Bangladesh
  if (item.country_code && item.country_code.toLowerCase() !== 'bd') {
    return false;
  }

  // If country is specified and not Bangladesh, reject
  if (item.country) {
    const cLower = item.country.toLowerCase();
    if (cLower === 'bangladesh' || cLower.includes('bangladesh') || cLower === 'bd') {
      return true;
    }
  }

  // Coordinates check if available
  if (typeof item.lat === 'number' && typeof item.lon === 'number') {
    const insideCoords =
      item.lat >= BD_BOUNDS.minLat &&
      item.lat <= BD_BOUNDS.maxLat &&
      item.lon >= BD_BOUNDS.minLon &&
      item.lon <= BD_BOUNDS.maxLon;
    if (insideCoords) return true;
  }

  // Check whether any of the 64 districts or divisions are present in text/state/city/county
  const textBag = [
    item.formatted,
    item.address_line1,
    item.address_line2,
    item.city,
    item.state,
    item.county,
    item.state_district,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const keyword of DISTRICT_KEYWORDS) {
    if (textBag.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Searches the 64 official districts of Bangladesh instantly.
 * Supports 1-letter, 2-letter, and prefix searches in English and Bengali.
 */
export function searchBangladeshDistricts(query: string, maxResults = 8): LocationPoint[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched = BANGLADESH_DISTRICTS.filter((d) => {
    const nameLower = d.name.toLowerCase();
    const bnLower = d.bnName.toLowerCase();
    const divLower = d.division.toLowerCase();

    // Direct prefix match (for 1-2 characters e.g. "D", "Dh", "C", "Ch", "ঢ", "চ")
    if (nameLower.startsWith(q) || bnLower.startsWith(q)) return true;

    // Aliases prefix match
    if (d.aliases?.some((a) => a.toLowerCase().startsWith(q))) return true;

    // Division match if query is longer
    if (q.length >= 3 && (divLower.startsWith(q) || nameLower.includes(q) || bnLower.includes(q))) {
      return true;
    }

    return false;
  });

  // Sort matched: prefix match on name first, then division
  matched.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) || a.bnName.toLowerCase().startsWith(q);
    const bStarts = b.name.toLowerCase().startsWith(q) || b.bnName.toLowerCase().startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });

  return matched.slice(0, maxResults).map((d) => ({
    lat: d.lat,
    lon: d.lon,
    formatted: `${d.name}, ${d.division} Division, Bangladesh`,
    addressLine1: `${d.name} (${d.bnName})`,
    addressLine2: `${d.division} Division, Bangladesh`,
    name: d.name,
    city: d.name,
    country: 'Bangladesh',
    category: 'district',
    resultType: 'district',
    placeId: `bd_district_${d.id}`,
  }));
}
