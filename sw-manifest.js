// sw-manifest.js - Service Worker que genera manifest dinámico
const DEFAULT_MANIFEST = {
  name: "Boutique Online",
  short_name: "Boutique",
  description: "Catálogo online personalizado",
  start_url: "./",
  display: "standalone",
  background_color: "#ffffff",
  theme_color: "#6366f1",
  orientation: "portrait",
  scope: "./",
  lang: "es",
  icons: [
    {
      src: "https://cdn-icons-png.flaticon.com/512/1041/1041888.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};

// Función para crear cliente Supabase ligero
function createSupabaseClient() {
  const SUPABASE_URL = "https://cirrapytmbnjlhxunkaq.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcnJhcHl0bWJuamxoeHVua2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzAyMDAsImV4cCI6MjA3ODU0NjIwMH0.OtJiLGj1EvhPICFaA9ruL02Z9kSQ2jT0t3Smqph81C4";
  
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          single: async () => {
            const query = `${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${columns}`;
            const res = await fetch(query, {
              headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
            });
            const data = await res.json();
            return { data: Array.isArray(data) ? data[0] : data, error: null };
          },
        }),
      }),
    }),
  };
}

// Interceptar peticiones al manifest
self.addEventListener("fetch", async (event) => {
  const url = new URL(event.request.url);

  // Solo interceptar manifest.json
  if (url.pathname.includes("manifest.json")) {
    event.respondWith(generateManifest(url));
  }
});

// Generar manifest dinámico
async function generateManifest(url) {
  const alias = url.searchParams.get("u");
  const storeCode = url.searchParams.get("tienda");
  
  const supabase = createSupabaseClient();
  let storeData = null;

  try {
    if (alias) {
      const { data } = await supabase.from("usuarios").select("app_name, app_icon_url, pwa_theme_color, nombre").eq("slug", alias).single();
      storeData = data;
    } else if (storeCode) {
      const { data } = await supabase.from("usuarios").select("app_name, app_icon_url, pwa_theme_color, nombre").eq("codigo_tienda", storeCode).single();
      storeData = data;
    }
  } catch (e) {
    console.error("Error fetching store:", e);
  }

  const manifest = {
    name: storeData?.app_name || storeData?.nombre || "Boutique Online",
    short_name: (storeData?.app_name || storeData?.nombre || "Boutique").substring(0, 12),
    description: `Catálogo online de ${storeData?.app_name || storeData?.nombre || "tienda"}`,
    start_url: `.${alias ? `?u=${alias}` : `?tienda=${storeCode}`}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: storeData?.pwa_theme_color || "#6366f1",
    orientation: "portrait",
    scope: "./",
    lang: "es",
    icons: [
      {
        src: storeData?.app_icon_url || "https://cdn-icons-png.flaticon.com/512/1041/1041888.png",
        sizes: "72x72 96x96 128x128 144x144 152x152 192x192 384x384 512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
