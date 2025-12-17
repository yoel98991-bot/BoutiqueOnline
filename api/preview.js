import { createClient } from '@supabase/supabase-js';

// TUS CREDENCIALES (Están correctas)
const SUPABASE_URL = 'https://cirrapytmbnjlhxunkaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcnJhcHl0bWJuamxoeHVua2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzAyMDAsImV4cCI6MjA3ODU0NjIwMH0.OtJiLGj1EvhPICFaA9ruL02Z9kSQ2jT0t3Smqph81C4';

// DOMINIO CORRECTO
const MY_DOMAIN = 'https://boutique-online-pink.vercel.app';

export default async function handler(req, res) {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const { u, product } = req.query;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let title, description, image, finalUrl;

  try {
    // =================================================================
    // CASO A: ES UN PRODUCTO
    // =================================================================
    if (product) {
        // CORRECCIÓN: Usamos 'creado_por' en lugar de 'usuario_id'
        const { data: prodData, error } = await supabase
            .from('productos')
            .select('nombre, precio, imagen_url, descripcion, creado_por') 
            .eq('id', product)
            .single();

        if (error || !prodData) throw new Error('Producto no encontrado');

        title = prodData.nombre; // CORRECCIÓN: 'nombre' en vez de 'titulo'
        description = `Precio: $${prodData.precio} - ${prodData.descripcion || 'Ver detalles'}`;
        image = prodData.imagen_url;
        
        // URL FINAL CORREGIDA
        finalUrl = `${MY_DOMAIN}/?u=${u || prodData.creado_por}&product=${product}`;
    } 
    
    // =================================================================
    // CASO B: ES UNA TIENDA
    // =================================================================
    else if (u) {
        // CORRECCIÓN: Tabla 'usuarios' en lugar de 'perfiles'
        // CORRECCIÓN: Columnas 'nombre', 'logo_url', 'slug'
        const { data: storeData, error } = await supabase
            .from('usuarios')
            .select('nombre, pwa_nombre_app, logo_url, slug, id, codigo_tienda')
            .or(`id.eq.${u},slug.eq.${u},codigo_tienda.eq.${u}`)
            .single();

        if (error || !storeData) {
            title = "Mi Tienda Online"; 
            description = "Visita mi catálogo";
            finalUrl = `${MY_DOMAIN}/?u=${u}`;
        } else {
            title = storeData.pwa_nombre_app || storeData.nombre || "Mi Tienda";
            description = `Visita la tienda de ${storeData.nombre}`;
            image = storeData.logo_url;
            
            // Usamos el código de tienda o slug para la URL
            const identifier = storeData.slug || storeData.codigo_tienda || storeData.id;
            finalUrl = `${MY_DOMAIN}/?u=${identifier}`;
        }
    }

    // =================================================================
    // CASO C: REDIRECCIÓN DEFAULT
    // =================================================================
    else {
        res.setHeader('Location', `${MY_DOMAIN}/`);
        return res.status(302).send('Redirigiendo...');
    }

    // GENERACIÓN DEL HTML
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
        <meta property="og:image" content="${image || `${MY_DOMAIN}/icon-512.png`}">
        
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${image || `${MY_DOMAIN}/icon-512.png`}">

        <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="loader"></div>
        <p>Cargando ${title}...</p>
        <script>
            setTimeout(() => {
                window.location.href = "${finalUrl}";
            }, 100);
        </script>
    </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error(error);
    res.setHeader('Location', `${MY_DOMAIN}/?u=${u || ''}`);
    return res.status(302).send('Redirigiendo...');
  }
}
