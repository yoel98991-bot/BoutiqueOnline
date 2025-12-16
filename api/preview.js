// /api/preview.js
export default async function handler(req, res) {
  const { u, product } = req.query;

  if (!product) {
    res.writeHead(302, {
      Location: `https://boutique-online-nine.vercel.app/?u=${u || ''}`,
    });
    res.end();
    return;
  }

  try {
    // Llamar a la Edge Function de Supabase
    const supabaseUrl = `https://cirrapytmbnjlhxunkaq.supabase.co/functions/v1/product-preview?u=${u}&product=${product}`;
    
    const response = await fetch(supabaseUrl);
    const html = await response.text();

    // Configurar cabeceras para caché
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching preview:', error);
    // Fallback a redirección
    res.writeHead(302, {
      Location: `https://boutique-online-nine.vercel.app/?u=${u}&product=${product}`,
    });
    res.end();
  }
}
