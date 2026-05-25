// Production Orchestration — data layer
// Replace each constant with a real useQuery call as backend endpoints are built.
// MOCK_QC_TEMPLATES contains the real built-in template definitions (not test data).
import type {
    MasterJob,
    ProductionComponent,
    Dependency,
    Task,
    QCCheckpoint,
    AMAttachment,
    AuditEntry,
    QCTemplate,
    DispatchOrchestrationUnit,
    ReconciliationJobRow,
    JobRisk,
} from "./types";

export const MOCK_JOBS: MasterJob[] = [];
export const MOCK_COMPONENTS: ProductionComponent[] = [];
export const MOCK_DEPENDENCIES: Dependency[] = [];
export const MOCK_TASKS: Task[] = [];
export const MOCK_AM_ATTACHMENTS: AMAttachment[] = [];
export const MOCK_AUDIT: AuditEntry[] = [];
export const MOCK_QC_CHECKPOINTS: QCCheckpoint[] = [];

export const MOCK_DISPATCH_QUEUE: DispatchOrchestrationUnit[] = [];

export const MOCK_RECONCILIATION_ROWS: ReconciliationJobRow[] = [];

export const MOCK_JOB_RISKS: JobRisk[] = [];

export const MOCK_QC_TEMPLATES: QCTemplate[] = [
    {
        key: "embroidery",
        name: "Embroidery",
        icon: "🧵",
        productionType: "Embroidery",
        checkpoints: [
            { description: "Thread colors match approved design spec", category: "Color" },
            { description: "Embroidery placement matches mockup measurements", category: "Placement" },
            { description: "Stitch density is consistent throughout", category: "Quality" },
            { description: "No loose threads, pulls, or fraying", category: "Finish" },
            { description: "Backing fabric is secure and does not show through", category: "Finish" },
            { description: "Garment not puckered or distorted", category: "Substrate" },
            { description: "Logo is legible and proportionally correct", category: "Artwork" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
            { description: "Garments folded and packed — size labels correct", category: "Packaging" },
        ],
    },
    {
        key: "uv",
        name: "UV Print",
        icon: "☀️",
        productionType: "UV Print",
        checkpoints: [
            { description: "Artwork matches approved mockup exactly", category: "Artwork" },
            { description: "Color output matches Pantone/brand spec", category: "Color" },
            { description: "Print coverage is even — no banding or streaks", category: "Quality" },
            { description: "UV ink fully cured — no tackiness", category: "Finish" },
            { description: "Print position correct per mockup measurements", category: "Placement" },
            { description: "No scratches or surface damage on substrate", category: "Substrate" },
            { description: "Edges clean and sharp — no bleeding", category: "Quality" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
            { description: "White underbase even and opaque (if applicable)", category: "Underbase" },
            { description: "Logo legibility confirmed at reading distance", category: "Artwork" },
            { description: "Packaging protective — no item-to-item contact damage", category: "Packaging" },
            { description: "Production officer sign-off complete", category: "Sign-off" },
        ],
    },
    {
        key: "dtf",
        name: "DTF / Transfer Print",
        icon: "🖨️",
        productionType: "DTF",
        checkpoints: [
            { description: "Transfer adhesion tested — no peeling at edges", category: "Adhesion" },
            { description: "Colors match approved digital proof", category: "Color" },
            { description: "Placement is centered and aligned to spec", category: "Placement" },
            { description: "No cracking after heat application", category: "Finish" },
            { description: "Fabric not scorched or discolored", category: "Substrate" },
            { description: "Edge detail is clean and precise", category: "Quality" },
            { description: "Wash test sample passed (if required)", category: "Durability" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
        ],
    },
    {
        key: "screen_print",
        name: "Screen Print",
        icon: "🎨",
        productionType: "Screen Print",
        checkpoints: [
            { description: "Screen registration accurate across all colors", category: "Registration" },
            { description: "Color vibrancy matches approved strike-off", category: "Color" },
            { description: "Ink coverage even with no pinholes", category: "Quality" },
            { description: "Ink fully cured — wash test passed", category: "Finish" },
            { description: "Placement matches mockup measurements", category: "Placement" },
            { description: "No ink bleed beyond design boundary", category: "Quality" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
        ],
    },
    {
        key: "engraving",
        name: "Engraving / Laser",
        icon: "🔩",
        productionType: "Engraving",
        checkpoints: [
            { description: "Engraving depth is consistent across all pieces", category: "Depth" },
            { description: "Text/logo alignment matches approved artwork", category: "Placement" },
            { description: "No surface scratches outside engraving area", category: "Surface" },
            { description: "Engraving edges are clean — no rough burrs", category: "Finish" },
            { description: "Material integrity maintained — no cracks or warping", category: "Substrate" },
            { description: "Logo/text is legible at intended viewing distance", category: "Artwork" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
        ],
    },
    {
        key: "large_format",
        name: "Large Format / Banners",
        icon: "🖼️",
        productionType: "Large Format",
        checkpoints: [
            { description: "Print dimensions match order spec (width × height)", category: "Dimensions" },
            { description: "Color output matches approved proof", category: "Color" },
            { description: "No banding, streaks, or print head artifacts", category: "Quality" },
            { description: "Hem/finishing matches spec (hemmed, eyelets, pole pockets)", category: "Finish" },
            { description: "Graphics bleed correct — no white edges", category: "Artwork" },
            { description: "Media substrate as specified (vinyl/fabric/canvas)", category: "Substrate" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
        ],
    },
    {
        key: "packaging",
        name: "Packaging & Inserts",
        icon: "📦",
        productionType: "Packaging",
        checkpoints: [
            { description: "Box dimensions match product/shipping requirements", category: "Dimensions" },
            { description: "Print quality and color match approved proof", category: "Color" },
            { description: "Die-cut lines clean — no tearing or rough edges", category: "Finish" },
            { description: "Fold lines score cleanly — boxes assemble correctly", category: "Quality" },
            { description: "Insert layout correct — all items fit as specified", category: "Placement" },
            { description: "Quantity counted and matches job sheet", category: "Quantity" },
            { description: "Assembled packaging sign-off complete", category: "Sign-off" },
        ],
    },
    {
        key: "field",
        name: "Delivery & Installation",
        icon: "🚚",
        productionType: "Field",
        checkpoints: [
            { description: "All items loaded match dispatch note", category: "Quantity" },
            { description: "Items packed to prevent transit damage", category: "Packaging" },
            { description: "Delivery address confirmed with client", category: "Logistics" },
            { description: "Installation site accessible and ready", category: "Site" },
            { description: "Installation completed per specification", category: "Installation" },
            { description: "Client sign-off / POD obtained", category: "Sign-off" },
        ],
    },
];
