
import { createClient } from '@supabase/supabase-js';

// TUS CREDENCIALES (Se mantienen igual)
const SUPABASE_URL = 'https://cirrapytmbnjlhxunkaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcnJhcHl0bWJuamxoeHVua2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzAyMDAsImV4cCI6MjA3ODU0NjIwMH0.OtJiLGj1EvhPICFaA9ruL02Z9kSQ2jT0t3Smqph81C4';

export default async function handler(req, res) {
  // Manejar CORS (Igual que antes)
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
    // CASO A: ES UN PRODUCTO (TU LÓGICA ORIGINAL)
    // =================================================================
    if (product) {
        const { data: prodData, error } = await supabase
            .from('productos')
            .select('titulo, precio, imagen_url, descripcion, usuario_id')
            .eq('id', product)
            .single();

        if (error || !prodData) throw new Error('Producto no encontrado');

        title = prodData.titulo;
        description = `Precio: $${prodData.precio} - ${prodData.descripcion || 'Ver detalles'}`;
        image = prodData.imagen_url;
        // Mantenemos la estructura de URL que ya te funciona
        // Cambia por tu dominio correcto
finalUrl = `https://boutique-online-pink.vercel.app/?u=${u || prodData.usuario_id}&p=${product}`;
    } 
    
    // =================================================================
    // CASO B: ES UNA TIENDA (NUEVA LÓGICA)
    // Se ejecuta solo si NO hay producto, pero SÍ hay usuario (u)
    // =================================================================
    else if (u) {
        // Buscamos en la tabla 'perfiles' usando el ID o el ALIAS
        const { data: storeData, error } = await supabase
            .from('perfiles')
            .select('nombre_negocio, bio, avatar_url, alias, id')
            .or(`id.eq.${u},alias.eq.${u}`)
            .single();

        if (error || !storeData) {
            // Si falla, mandamos valores por defecto para que no rompa
            title = "Mi Tienda Online"; 
            description = "Visita mi catálogo";
            finalUrl = `https://boutique-online-nine.vercel.app/?u=${u}`;
        } else {
            title = storeData.nombre_negocio || "Mi Tienda";
            description = storeData.bio || "¡Mira mis productos disponibles!";
            image = storeData.avatar_url; // Si es null, el HTML abajo manejará un fallback visual, pero los meta tags quedarán vacíos (no rompe)
            
            // Usamos el alias si existe para la URL final, si no el ID
            const identifier = storeData.alias || storeData.id;
            finalUrl = `https://boutique-online-nine.vercel.app/?u=${identifier}`;
        }
    }

    // =================================================================
    // CASO C: NO HAY DATOS (REDIRIGIR)
    // =================================================================
    else {
        res.setHeader('Location', `https://boutique-online-nine.vercel.app/`);
        return res.status(302).send('Redirigiendo...');
    }

    // GENERACIÓN DEL HTML (Sirve para ambos casos)
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
        <meta property="og:image" content="${image || 'https://boutique-online-nine.vercel.app/icon-512.png'}">
        
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:title" content="${title}">
        <meta property="twitter:description" content="${description}">
        <meta property="twitter:image" content="${image || 'https://boutique-online-nine.vercel.app/icon-512.png'}">

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
    // Fallback de seguridad
    console.error(error);
    // Cambia por tu dominio correcto
res.setHeader('Location', `https://boutique-online-pink.vercel.app/?u=${u || ''}`);
    return res.status(302).send('Redirigiendo...');
  }
}
