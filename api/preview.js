// /api/product-preview.js
const SUPABASE_URL = 'https://cirrapytmbnjlhxunkaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcnJhcHl0bWJuamxoeHVua2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzAyMDAsImV4cCI6MjA3ODU0NjIwMH0.OtJiLGj1EvhPICFaA9ruL02Z9kSQ2jT0t3Smqph81C4';

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { u, product } = req.query;

  // Si no hay ID de producto, redirigir al inicio
  if (!product) {
    res.setHeader('Location', `https://boutique-online-nine.vercel.app/?u=${u || ''}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(302).send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=https://boutique-online-nine.vercel.app/?u=${u || ''}">
        </head>
        <body>
          <p>Redirigiendo a la tienda...</p>
        </body>
      </html>
    `);
  }

  try {
    // 1. Fetch directamente a Supabase REST API (sin cliente)
    const productResponse = await fetch(`${SUPABASE_URL}/rest/v1/productos?id=eq.${product}&select=nombre,descripcion,precio,imagen_url,categoria,stock,creado_por`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const productData = await productResponse.json();
    
    if (!productData || productData.length === 0) {
      throw new Error('Producto no encontrado');
    }

    const producto = productData[0];

    // 2. Verificar que el producto pertenezca a la tienda correcta
    // Primero obtenemos el usuario dueño de la tienda
    const storeResponse = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?select=id,codigo_tienda,nombre,logo_url&or=(codigo_tienda.eq.${u},slug.eq.${u})`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const storeData = await storeResponse.json();
    
    if (!storeData || storeData.length === 0) {
      throw new Error('Tienda no encontrada');
    }

    const tienda = storeData[0];

    // 3. Buscar calificaciones del producto
    const ratingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/comentarios?producto_id=eq.${product}&select=estrellas`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const ratingsData = await ratingsResponse.json();

    // 4. Buscar ventas del producto
    const salesResponse = await fetch(`${SUPABASE_URL}/rest/v1/pedidos?productos->>items@>0->>id=eq.${product}&estado=eq.completado&select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const salesData = await salesResponse.json();

    // 5. Calcular estadísticas
    let ratingText = "⭐ Nuevo";
    let totalRating = 0;
    let ratingCount = 0;

    if (ratingsData && ratingsData.length > 0) {
      totalRating = ratingsData.reduce((sum, r) => sum + (r.estrellas || 5), 0);
      ratingCount = ratingsData.length;
      const avgRating = (totalRating / ratingCount).toFixed(1);
      ratingText = `⭐ ${avgRating}/5 (${ratingCount} opiniones)`;
    }

    const salesCount = salesData ? salesData.length : 0;
    const salesText = salesCount > 0 ? `🔥 ${salesCount} vendidos` : '✨ Nuevo';

    // 6. Preparar datos para el preview
    const productName = producto.nombre || 'Producto';
    const productPrice = producto.precio || 0;
    const productDescription = producto.descripcion || `Producto de calidad de ${tienda.nombre || 'nuestra tienda'}`;
    const productImage = producto.imagen_url || 'https://boutique-online-nine.vercel.app/default-product.png';
    const productCategory = producto.categoria || 'General';

    // 7. URL final a la que irá el usuario
    const finalUrl = `https://boutique-online-nine.vercel.app/?u=${u}&product=${product}`;

    // 8. Construir el HTML con meta tags optimizados para WhatsApp
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>${productName} - $${productPrice.toFixed(2)} | ${tienda.nombre || 'Tienda Online'}</title>
    <meta name="description" content="${productDescription.substring(0, 155)}... ${ratingText} ${salesText}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product">
    <meta property="og:url" content="${finalUrl}">
    <meta property="og:title" content="${productName} - $${productPrice.toFixed(2)} | ${ratingText}">
    <meta property="og:description" content="${productDescription.substring(0, 155)}... ${salesText}">
    <meta property="og:image" content="${productImage}">
    <meta property="og:image:width" content="800">
    <meta property="og:image:height" content="800">
    <meta property="og:image:alt" content="${productName}">
    <meta property="product:price:amount" content="${productPrice}">
    <meta property="product:price:currency" content="USD">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${finalUrl}">
    <meta name="twitter:title" content="${productName} - $${productPrice.toFixed(2)}">
    <meta name="twitter:description" content="${productDescription.substring(0, 155)}...">
    <meta name="twitter:image" content="${productImage}">
    
    <!-- WhatsApp Specific -->
    <meta property="og:site_name" content="${tienda.nombre || 'Tienda Online'}">
    
    <!-- Redirection to actual page -->
    <meta http-equiv="refresh" content="0;url=${finalUrl}">
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .preview-card {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            overflow: hidden;
            animation: fadeIn 0.5s ease-out;
        }
        
        .preview-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            background: #f3f4f6;
        }
        
        .preview-content {
            padding: 30px;
        }
        
        .store-badge {
            display: inline-block;
            background: #e0e7ff;
            color: #4f46e5;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 15px;
        }
        
        .product-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 10px;
            line-height: 1.3;
        }
        
        .product-price {
            font-size: 2rem;
            font-weight: 800;
            color: #059669;
            margin-bottom: 15px;
        }
        
        .product-description {
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 20px;
            font-size: 1rem;
        }
        
        .product-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #4b5563;
            font-weight: 600;
        }
        
        .stat-item i {
            color: #f59e0b;
        }
        
        .loading-message {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4f46e5;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .redirect-button {
            display: block;
            width: 100%;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            border: none;
            padding: 18px;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            margin-top: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .redirect-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
        }
        
        @media (max-width: 480px) {
            .preview-card {
                border-radius: 20px;
            }
            
            .preview-image {
                height: 250px;
            }
            
            .product-title {
                font-size: 1.3rem;
            }
            
            .product-price {
                font-size: 1.7rem;
            }
        }
    </style>
</head>
<body>
    <div class="preview-card">
        <img src="${productImage}" alt="${productName}" class="preview-image" onerror="this.src='https://boutique-online-nine.vercel.app/default-product.png'">
        
        <div class="preview-content">
            <div class="store-badge">
                <i class="fas fa-store"></i> ${tienda.nombre || 'Tienda Online'}
            </div>
            
            <h1 class="product-title">${productName}</h1>
            
            <div class="product-price">$${productPrice.toFixed(2)}</div>
            
            <p class="product-description">${productDescription.substring(0, 200)}...</p>
            
            <div class="product-stats">
                <div class="stat-item">
                    <i class="fas fa-star"></i>
                    <span>${ratingText}</span>
                </div>
                <div class="stat-item">
                    <i class="fas ${salesCount > 0 ? 'fa-fire' : 'fa-gem'}"></i>
                    <span>${salesText}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-tag"></i>
                    <span>${productCategory}</span>
                </div>
            </div>
            
            <div class="loading-message">
                <div class="spinner"></div>
                <p>Redirigiendo al producto en <strong>${tienda.nombre || 'nuestra tienda'}</strong>...</p>
                <p style="font-size: 0.9rem; margin-top: 10px; color: #9ca3af;">
                    Si no eres redirigido automáticamente en 3 segundos, usa el botón:
                </p>
            </div>
            
            <a href="${finalUrl}" class="redirect-button">
                <i class="fas fa-shopping-cart"></i> Ver Producto en Tienda
            </a>
        </div>
    </div>
    
    <script>
        // Redirección automática después de 2 segundos
        setTimeout(() => {
            window.location.href = "${finalUrl}";
        }, 2000);
        
        // Para crawlers que no ejecutan JavaScript
        document.addEventListener('DOMContentLoaded', function() {
            const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
            if (!metaRefresh) {
                const fallbackMeta = document.createElement('meta');
                fallbackMeta.httpEquiv = "refresh";
                fallbackMeta.content = "2;url=${finalUrl}";
                document.head.appendChild(fallbackMeta);
            }
        });
    </script>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js" crossorigin="anonymous"></script>
</body>
</html>`;

    // Configurar cabeceras para caché y respuesta
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, max-age=3600');
    res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error generando preview:', error);
    
    // Fallback: redirigir a la página principal
    res.setHeader('Location', `https://boutique-online-nine.vercel.app/?u=${u || ''}`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    return res.status(302).send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=https://boutique-online-nine.vercel.app/?u=${u || ''}">
          <title>Redirigiendo...</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px; text-align: center;">
          <p>Redirigiendo a la tienda...</p>
          <script>
            window.location.href = "https://boutique-online-nine.vercel.app/?u=${u || ''}";
          </script>
        </body>
      </html>
    `);
  }
}
