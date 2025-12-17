import { createClient } from '@supabase/supabase-js';

// Configuración
const SUPABASE_URL = 'https://cirrapytmbnjlhxunkaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcnJhcHl0bWJuamxoeHVua2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzAyMDAsImV4cCI6MjA3ODU0NjIwMH0.OtJiLGj1EvhPICFaA9ruL02Z9kSQ2jT0t3Smqph81C4';
// IMPORTANTE: Cambia esto por tu dominio real de Vercel
const MY_DOMAIN = 'https://boutique-online-pink.vercel.app';

export default async function handler(req, res) {
  // CORS Headers
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
    // CASO A: VISTA PREVIA DE PRODUCTO
    if (product) {
        // 1. Obtener datos del producto (schema public.productos)
        const { data: prodData, error } = await supabase
            .from('productos')
            .select('nombre, precio, imagen_url, descripcion, creado_por') 
            .eq('id', product)
            .single(); //

        if (error || !prodData) throw new Error('Producto no encontrado');

        // 2. Calcular promedio de estrellas (schema public.comentarios)
        const { data: reviews } = await supabase
            .from('comentarios')
            .select('estrellas')
            .eq('producto_id', product); //
        
        let starText = "✨ Nuevo";
        if (reviews && reviews.length > 0) {
            const total = reviews.reduce((sum, r) => sum + r.estrellas, 0);
            const avg = (total / reviews.length).toFixed(1);
            starText = `⭐ ${avg} (${reviews.length})`;
        }

        // 3. Construir Metadatos
        title = `${starText} | ${prodData.nombre} - $${prodData.precio}`;
        description = prodData.descripcion ? prodData.descripcion.substring(0, 120) + '...' : 'Ver detalles del producto.';
        image = prodData.imagen_url;
        
        // URL de destino (redirección final)
        finalUrl = `${MY_DOMAIN}/?u=${u || prodData.creado_por}&product=${product}`;
    } 
    
    // CASO B: VISTA PREVIA DE TIENDA
    else if (u) {
        // Buscar tienda por ID, Slug o Código (schema public.usuarios)
        const { data: storeData, error } = await supabase
            .from('usuarios')
            .select('nombre, pwa_nombre_app, logo_url, slug, id, codigo_tienda, app_name')
            .or(`id.eq.${u},slug.eq.${u},codigo_tienda.eq.${u}`)
            .single(); //

        if (error || !storeData) {
            title = "Tienda Online";
            description = "Catálogo de productos";
            finalUrl = `${MY_DOMAIN}/?u=${u}`;
        } else {
            // Preferir el nombre de la App configurado, si no, el nombre del usuario
            const name = storeData.pwa_nombre_app || storeData.app_name || storeData.nombre;
            title = `${name} 🛍️ | Catálogo Online`;
            description = `Visita nuestra tienda virtual. ¡Envíos seguros y los mejores precios!`;
            image = storeData.logo_url;
            
            // Usar el mejor identificador disponible para la URL limpia
            const identifier = storeData.slug || storeData.codigo_tienda || storeData.id;
            finalUrl = `${MY_DOMAIN}/?u=${identifier}`;
        }
    } else {
        // Fallback
        res.setHeader('Location', `${MY_DOMAIN}/`);
        return res.status(302).send('Redirigiendo...');
    }

    // Generar HTML con Open Graph Tags
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
        
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${image || `${MY_DOMAIN}/icon-512.png`}">
        
        <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8f9fa;color:#333} .loader{border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>
    </head>
    <body>
        <div style="text-align:center">
            <div class="loader" style="margin:0 auto 15px"></div>
            <p>Entrando a ${title}...</p>
        </div>
        <script>setTimeout(()=>{window.location.href="${finalUrl}"}, 500);</script>
    </body>
    </html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // Cache corto para actualizar estrellas rápido
    return res.status(200).send(html);

  } catch (error) {
    console.error(error);
    res.setHeader('Location', `${MY_DOMAIN}/`);
    return res.status(302).send('Redirigiendo...');
  }
}
