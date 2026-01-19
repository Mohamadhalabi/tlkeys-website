import { defineEventHandler, sendRedirect, getQuery } from 'h3'
import { parseURL, withoutTrailingSlash, withLeadingSlash } from 'ufo'

/* --- 1. Constants & Helpers --- */
const LOCALES = ['en', 'ar', 'es', 'fr', 'ru', 'de', 'tr', 'pt', 'it']

// Normalize path: lowercase, decode URI, ensure leading slash, remove trailing slash
function normPath(p?: string) {
    const clean = (p || '/').split('?')[0]
    return withoutTrailingSlash(withLeadingSlash(decodeURIComponent(clean).toLowerCase()))
}

// Split locale from path: /en/shop -> { locale: '/en', path: '/shop' }
function splitLocale(pathname: string) {
    const seg = pathname.split('/')
    const maybe = seg[1]
    if (maybe && LOCALES.includes(maybe)) {
        return { locale: '/' + maybe, path: '/' + seg.slice(2).join('/') }
    }
    return { locale: '', path: pathname }
}

/* --- 2. Static Data Rules --- */
// I have included your full list here
const RAW_REDIRECTS = [
    // --- Brands ---
    { from: "/shop/alfa-romeo", to: "/alfa-romeo" },
    { from: "/shop/audi", to: "/audi" },
    { from: "/shop/baic", to: "/baic" },
    { from: "/shop/bentley", to: "/bentley" },
    { from: "/shop/bmw", to: "/bmw" },
    { from: "/shop/buick", to: "/buick" },
    { from: "/shop/brilliance", to: "/brilliance" },
    { from: "/shop/cadillac", to: "/cadillac" },
    { from: "/shop/changan", to: "/changan" },
    { from: "/shop/chery", to: "/chery" },
    { from: "/shop/chevrolet", to: "/chevrolet" },
    { from: "/shop/chrysler", to: "/chrysler" },
    { from: "/shop/citroen", to: "/citroen" },
    { from: "/shop/dodge", to: "/dodge" },
    { from: "/shop/ferrari", to: "/ferrari" },
    { from: "/shop/fiat", to: "/fiat" },
    { from: "/shop/ford", to: "/ford" },
    { from: "/shop/geely", to: "/geely" },
    { from: "/shop/gmc", to: "/gmc" },
    { from: "/shop/haval", to: "/haval" },
    { from: "/shop/honda", to: "/honda" },
    { from: "/shop/hummer", to: "/hummer" },
    { from: "/shop/hyundai", to: "/hyundai" },
    { from: "/shop/infiniti", to: "/infiniti" },
    { from: "/shop/isuzu", to: "/isuzu" },
    { from: "/shop/jac-motors", to: "/jac-motors" },
    { from: "/shop/jaguar", to: "/jaguar" },
    { from: "/shop/jeep", to: "/jeep" },
    { from: "/shop/kia", to: "/kia" },
    { from: "/shop/land-rover", to: "/land-rover" },
    { from: "/shop/lexus", to: "/lexus" },
    { from: "/shop/lifan", to: "/lifan" },
    { from: "/shop/mazda", to: "/mazda" },
    { from: "/shop/mercedes", to: "/mercedes-benz" },
    { from: "/shop/mercury", to: "/mercury" },
    { from: "/shop/maserati", to: "/maserati" },
    { from: "/shop/mini-cooper", to: "/mini" },
    { from: "/shop/mitsubishi", to: "/mitsubishi" },
    { from: "/shop/mg", to: "/mg" },
    { from: "/shop/nissan", to: "/nissan" },
    { from: "/shop/opel", to: "/opel" },
    { from: "/shop/peugeot", to: "/peugeot" },
    { from: "/shop/pontiac", to: "/pontiac" },
    { from: "/shop/porsche", to: "/porsche" },
    { from: "/shop/renault", to: "/renault" },
    { from: "/shop/rolls-royce", to: "/rolls-royce" },
    { from: "/shop/saab", to: "/saab" },
    { from: "/shop/saturn", to: "/saturn" },
    { from: "/shop/scion", to: "/scion" },
    { from: "/shop/smart-car", to: "/smart-car" },
    { from: "/shop/ssangyong", to: "/ssangyong" },
    { from: "/shop/subaru", to: "/subaru" },
    { from: "/shop/suzuki", to: "/suzuki" },
    { from: "/shop/tesla", to: "/tesla" },
    { from: "/shop/toyota", to: "/toyota" },
    { from: "/shop/volkswagen", to: "/volkswagen" },
    { from: "/shop/volvo", to: "/volvo" },
    { from: "/shop/lincoln", to: "/lincoln" },
    { from: "/shop/ram-car", to: "/ram" },
    { from: "/shop/corvette", to: "/corvette" },

    // --- Categories ---
    { from: "/shop/car-remotes", to: "/car-Remotes" },
    { from: "/shop/remote-shell", to: "/remote-shell" },
    { from: "/shop/lcd-remotes", to: "/lcd-remotes" },
    { from: "/shop/smart-key-box", to: "/smart-key-box" },
    { from: "/shop/transponder-key", to: "/transponder-keys" },
    { from: "/shop/key-shell", to: "/key-shell" },
    { from: "/shop/blades", to: "/blades" },
    { from: "/shop/emergency-key-blade", to: "/emergency-keys" },
    { from: "/shop/key-programming-device", to: "/key-programming-diagnostics-tools" },
    { from: "/shop/key-tester", to: "/testing-tool" },
    { from: "/shop/transponders", to: "/transponder-chip-coil" },
    { from: "/shop/remote-replacement-parts", to: "/replacement-parts" },
    { from: "/shop/garage-gate-remote", to: "/garage-gate-remote" },
    { from: "/shop/emulators", to: "/emulators" },
    { from: "/shop/key-cutting-machine", to: "/key-cutting-machine" },
    { from: "/shop/immobilizer", to: "/immobilizer-smart-box" },
    { from: "/shop/adapter", to: "/adapter" },
    { from: "/shop/cable", to: "/cables" },
    { from: "/shop/pincode-calculators", to: "/pincode-calculators" },
    { from: "/shop/smart-watch", to: "/Watches-Remote" },
    { from: "/shop/soldering-tool", to: "/soldering-tools" },
    { from: "/shop/eeprom-&-flash", to: "/eeprom-flash-and-mcu-chip" },
    { from: "/shop/motorcycle", to: "/motorbike-key" },
    { from: "/shop/ignitions", to: "/ignition-locks" },
    { from: "/shop/ignition-lock-tools", to: "/ignition-lock-cylinder" },
    { from: "/shop/maintenance-tools", to: "/maintenance-tools" },
    { from: "/shop/steering-lock", to: "/steering-lock" },
    { from: "/shop/spare-parts", to: "/spare-parts" },
    { from: "/shop/battery", to: "/battery" },
    { from: "/shop/token-kia-hyundai", to: "/pin-code" },
    { from: "/shop/software", to: "/software" },
    { from: "/shop/accessories", to: "/accessories-tools" },

    // --- Manufacturers ---
    { from: "/shop/advanced-diagnostics", to: "/advanced-diagnostics" },
    { from: "/shop/keyline", to: "/keyline" },
    { from: "/shop/gscan", to: "/g-scan" },
    { from: "/shop/xhorse", to: "/xhorse" },
    { from: "/shop/obdstar", to: "/obdstar" },
    { from: "/shop/scorpio-ik-ltd", to: "/scorpio-ik-ltd" },
    { from: "/shop/orange", to: "/orange5" },
    { from: "/shop/tango", to: "/tango" },
    { from: "/shop/barracuda", to: "/barracuda" },
    { from: "/shop/autohex-ii", to: "/autohex-ii" },
    { from: "/shop/autel", to: "/autel" },
    { from: "/shop/lonsdor", to: "/lonsdor" },
    { from: "/shop/keydiy", to: "/key-diy-kd" },
    { from: "/shop/mb-tool", to: "/mb-tool" },
    { from: "/shop/code-wizzard-pro-2", to: "/code-wizard-pro-2-cwp-2" },
    { from: "/shop/abrites", to: "/abrites" },
    { from: "/shop/keymax", to: "/keymax" },
    { from: "/shop/xtool", to: "/XTOOL" },
    { from: "/shop/strattec", to: "/strattec" },
    { from: "/shop/cg-automotive-diagnostic", to: "/CG-Automotive-diagnostic" },
    { from: "/shop/raise", to: "/raise" },
    { from: "/shop/lishi", to: "/lishi" },
    { from: "/shop/microtronik", to: "/microtronik" },
    { from: "/shop/eldb", to: "/eldb" },

    // --- Specific Product Fixes ---
    { from: "/products/chevrolet-2017-proximity-flip-key-5b-433mhz-aftermarket-bran-33079", to: "/products/Chevrolet-2017-Proximity-Flip-Key-13531362-5B-433mhz-33079" },
    { from: "/products/original-nissan-2013-2018-flip-key-3-buttons-433mhz-h0561-4ca0b-40231", to: "/products/Original-Nissan-Sunny-2018-2024-Flip-Key-3-Buttons-433MHz-40231" },
    { from: "/products/original-ford-f-150-2017-smart-key-remote-3-buttons-868mhz-id49-chip-gb5t-15k601-db-36157", to: "/products/SUNSHINE-LC-AD15-Infrared-Thermal-Imaging-Analyzing-Camera-400W-3D-36157" },
    { from: "/products/lonsdor-toyota-corolla-lt30-01-universal-smart-key-board-4-buttons", to: "/products/lonsdor-lt30-01-4a-universal-smart-remote-pcb" },
    { from: "/products/xhorse-key-tool-midi-immo-tpms-device", to: "/products/xhorse-xdkmd0en-key-tool-midi-immo-tpms-basic-version" },
]

// --- Optimization: Build Map ONCE on server start ---
const REDIRECT_MAP = new Map<string, string>()
RAW_REDIRECTS.forEach(r => {
    REDIRECT_MAP.set(normPath(r.from), r.to)
})


/* --- 3. Legacy Query Logic (Downloads/PHP) --- */
function checkLegacyQueries(event: any, path: string): string | null {
    const q = getQuery(event)
    const dev = (q.device as string | undefined)?.toLowerCase()

    if (path === '/download-files.php' && dev) {
        const map: Record<string, string> = {
            'ad100pro': '/downloads/AD-Loader-AD100-Advanced-Diagnostics-Download-and-Installation',
            'cggdi-bmw': '/downloads/CGDI-BMW-Software-Download-Installation',
            'tmpro': '/downloads/TMPRO',
            'ktm-flash': '/downloads/KT200',
            'kt200': '/downloads/KT200',
            'tango': '/downloads/tango-key-programmer',
            'g-scan': '/downloads/G-Scan',
            'gscan-tab': '/downloads/G-Scan-Tab',
            'orange-5': '/downloads/Orange-5',
            'pin-code': '/downloads/Diagcode',
            'codewizardpro': '/downloads/Diagcode',
            'barracuda': '/downloads/scorpio-lk-barracuda-key-programmer',
            'xhorse': '/downloads/xhorse-tool-software-download-and-Upgrade-kit',
            'xprog': '/downloads/Xhorse-VVDI-PROG-Programmer-Update-Software-Download',
            'vvdi-bimtool': '/downloads/Xhorse-VVDI-BIMTool-Software-Download-And-Installation',
            'at200': '/downloads/AT-200',
            'pcmtuner': '/downloads/PCMtuner',
            'fc200': '/downloads/FC200',
            'keydiy-download': '/downloads/keydiy',
            'xp400': '/downloads/XP400-pro',
            'skp900': '/downloads/SKP-900',
            'cg-mb': '/downloads/CG-MB',
            'cg-pro': '/downloads/CG-PRO',
            'cg100x': '/downloads/CG100X',
            'x100-pro': '/downloads/X100-PRO',
            'mvci-pro': '/downloads/MVCI-PRO',
            'htprog': '/downloads/HTProg',
            'vvdi-mb': '/downloads/xhorse-vvdi-mb',
        }
        return map[dev] ?? null
    }

    // Legacy PHP file paths
    const phpMap: Record<string, string> = {
        '/downloads/autohex.php': '/downloads/Microtronik-Autohex-II',
        '/downloads/xhorse.php': '/downloads/xhorse-vvdi-mb',
        '/downloads/vvdi-prog.php': '/downloads/Xhorse-VVDI-PROG-Programmer-Update-Software-Download',
        '/downloads/vvdi-2.php': '/downloads/Xhorse-VVDI2-Key-Programmer',
    }
    const cleanPath = path.replace('//', '/')
    if (phpMap[cleanPath]) return phpMap[cleanPath]

    return null
}


/* --- 4. Main Middleware Handler --- */
export default defineEventHandler((event) => {
    // 1. Prepare Paths
    const normalizedPath = normPath(event.path)
    const { locale, path } = splitLocale(normalizedPath)

    // ---------------------------------------------------------
    // PRIORITY 1: Dynamic Brand Redirects (e.g. products?brand=bmw)
    // ---------------------------------------------------------
    if (path === '/products') {
        const query = getQuery(event)
        const brand = query.brand

        if (brand && typeof brand === 'string') {
            const cleanBrand = brand.trim()
            // Redirect to /bmw or /de/bmw
            const newUrl = withLeadingSlash(withoutTrailingSlash(`${locale}/${cleanBrand}`))
            return sendRedirect(event, newUrl, 301)
        }
    }

    // ---------------------------------------------------------
    // PRIORITY 2: Legacy Query Redirects (PHP Downloads)
    // ---------------------------------------------------------
    const legacyDest = checkLegacyQueries(event, normalizedPath) // pass raw path for PHP checks
    if (legacyDest) {
        return sendRedirect(event, locale + legacyDest, 301)
    }

    // ---------------------------------------------------------
    // PRIORITY 3: Static Map Redirects (Brands, Categories, etc.)
    // ---------------------------------------------------------
    // This checks the optimized Map we built at the top
    const staticDest = REDIRECT_MAP.get(path)
    if (staticDest) {
        return sendRedirect(event, locale + staticDest, 301)
    }
})