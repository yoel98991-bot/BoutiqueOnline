import { createClient } from '@supabase/supabase-js';

// TUS CREDENCIALES
const SUPABASE_URL = 'https://cirrapytmbnjlhxunkaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcnJhcHl0bWJuamxoeHVua2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzAyMDAsImV4cCI6MjA3ODU0NjIwMH0.OtJiLGj1EvhPICFaA9ruL02Z9kSQ2jT0t3Smqph81C4';

// IMPORTANTE: Asegúrate de que este sea tu dominio EXACTO (sin barra al final)
const MY_DOMAIN = 'https://boutique-online-pink.vercel.app';

// Función auxiliar para saber si es un UUID válido (evita errores de base de datos)
const isUUID = (uuid) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

export default async function handler(req, res) {
  // Configuración CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { u, product } = req.query;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Valores por defecto (Fallback seguro)
  // Usamos una imagen externa segura por si falla la local, o usa tu icon-512.png si estás seguro que existe
  const DEFAULT_IMAGE = `${MY_DOMAIN}/icon-512.png`; 
  
  let title = "Tienda Online";
  let description = "Visita nuestro catálogo exclusivo.";
  let image = DEFAULT_IMAGE;
  let finalUrl = `${MY_DOMAIN}/`;

  try {
    // =================================================================
    // CASO A: ES UN PRODUCTO
    // =================================================================
    if (product) {
        // 1. Obtener datos del producto
        const { data: prodData, error } = await supabase
            .from('productos')
            .select('nombre, precio, imagen_url, descripcion, creado_por') 
            .eq('id', product)
            .single();

        if (!error && prodData) {
            // 2. Obtener estrellas
            const { data: reviews } = await supabase
                .from('comentarios')
                .select('estrellas')
                .eq('producto_id', product);
            
            let starString = "✨ Nuevo";
            if (reviews && reviews.length > 0) {
                const total = reviews.reduce((acc, r) => acc + r.estrellas, 0);
                const ratingAvg = (total / reviews.length).toFixed(1);
                starString = `⭐ ${ratingAvg} (${reviews.length})`;
            }

            // Configurar Metadatos
            title = `${starString} | ${prodData.nombre} - $${prodData.precio}`;
            
            // Descripción corta y limpia
            const descRaw = prodData.descripcion || 'Ver detalles y comprar online.';
            description = descRaw.substring(0, 150) + (descRaw.length > 150 ? '...' : '');
            
            // Asegurar que la imagen exista, si no, usa default
            if (prodData.imagen_url) {
                image = prodData.imagen_url; 
            }
            
            // URL de destino
            finalUrl = `${MY_DOMAIN}/?u=${u || prodData.creado_por}&product=${product}`;
        }
    } 
    
    // =================================================================
    // CASO B: ES UNA TIENDA (Soluciona el problema "Generico")
    // =================================================================
    else if (u) {
        let storeData = null;
        let error = null;

        // Lógica corregida: No buscar texto en campos UUID
        if (isUUID(u)) {
            // Si parece un ID, buscar por ID
            const result = await supabase
                .from('usuarios')
                .select('nombre, pwa_nombre_app, logo_url, slug, id, codigo_tienda')
                .eq('id', u)
                .single();
            storeData = result.data;
        } else {
            // Si NO es ID (es un alias/slug), buscar por slug o codigo
            // Usamos tal cual la estructura OR pero solo en campos de texto
            const result = await supabase
                .from('usuarios')
                .select('nombre, pwa_nombre_app, logo_url, slug, id, codigo_tienda')
                .or(`slug.eq.${u},codigo_tienda.eq.${u}`)
                .maybeSingle(); // maybeSingle evita error si no encuentra
            storeData = result.data;
        }

        if (storeData) {
            const storeName = storeData.pwa_nombre_app || storeData.nombre || "Mi Tienda";
            title = `Visita ${storeName} 🛍️`;
            description = `¡Mira nuestro catálogo exclusivo en ${storeName}! Calidad garantizada.`;
            
            if (storeData.logo_url) {
                image = storeData.logo_url;
            }
            
            const identifier = storeData.slug || storeData.codigo_tienda || storeData.id;
            finalUrl = `${MY_DOMAIN}/?u=${identifier}`;
        }
    }

    // =================================================================
    // GENERACIÓN HTML
    // =================================================================
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta name="description" content="${description}">
        
        <meta property="og:type" content="website">
        <meta property="og:url" content="${finalUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${image}">
        <meta property="og:image:alt" content="${title}">
        
        <meta property="og:image:width" content="600">
        <meta property="og:image:height" content="600">
        
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${image}">

        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5; color: #333; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 300px; text-align: center; }
            h1 { font-size: 1.2rem; margin: 0 0 10px 0; }
            p { font-size: 0.9rem; color: #666; }
            img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="loader"></div>
        <div class="card">
            <img src="${image}" onerror="this.style.display='none'" alt="Preview">
            <h1>Cargando...</h1>
            <p>${title}</p>
        </div>
        <script>
            setTimeout(() => {
                window.location.href = "${finalUrl}";
            }, 1000); 
        </script>
    </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache de 1 hora para evitar tantas llamadas a BD, pero permite actualizaciones
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error("Preview Error:", error);
    res.setHeader('Location', `${MY_DOMAIN}/`);
    return res.status(302).send('Redirigiendo...');
  }
}
