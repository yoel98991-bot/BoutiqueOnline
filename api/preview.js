import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN ---
// Asegúrate de que estas sean tus credenciales correctas
const SUPABASE_URL = 'https://cirrapytmbnjlhxunkaq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcnJhcHl0bWJuamxoeHVua2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NzAyMDAsImV4cCI6MjA3ODU0NjIwMH0.OtJiLGj1EvhPICFaA9ruL02Z9kSQ2jT0t3Smqph81C4';
const MY_DOMAIN = 'https://boutique-online-pink.vercel.app'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    // Permitir CORS por si acaso
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Obtenemos los parámetros de la URL (definidos en vercel.json)
    // u = codigo de tienda, product = id o slug del producto
    const { u, product } = req.query;

    // Valores por defecto (por si todo falla)
    let title = "Mi Tienda Online";
    let description = "Bienvenido a nuestra tienda.";
    let image = `${MY_DOMAIN}/Vende Facil.png`; // Icono por defecto de tu manifest

    try {
        // ---------------------------------------------------------
        // CASO 1: ES UN PRODUCTO (Lógica existente)
        // ---------------------------------------------------------
        if (product) {
            // Buscamos el producto por ID (asumiendo que 'product' es el ID numérico)
            // Si usas UUID o Slug, cambia .eq('id', product) según corresponda
            const { data: prodData, error } = await supabase
                .from('productos')
                .select('nombre, descripcion, imagen_url')
                .eq('id', product)
                .single();

            if (prodData && !error) {
                title = prodData.nombre;
                description = prodData.descripcion ? prodData.descripcion.substring(0, 150) + '...' : 'Detalles del producto';
                // Si hay imagen del producto, la usamos
                if (prodData.imagen_url) image = prodData.imagen_url;
            }
        } 
        // ---------------------------------------------------------
        // CASO 2: ES SOLO LA TIENDA (NUEVA LÓGICA AGREGADA)
        // ---------------------------------------------------------
        else if (u) {
            // Buscamos en la tabla 'usuarios' donde 'codigo_tienda' coincida con la URL
            const { data: storeData, error } = await supabase
                .from('usuarios')
                .select('nombre, logo_url, app_name, descripcion') // Traemos logo y nombre
                .eq('codigo_tienda', u)
                .single();

            if (storeData && !error) {
                // Usamos el nombre de la tienda o el nombre de la app
                title = storeData.nombre || storeData.app_name || "Tienda Virtual";
                description = `Visita la tienda de ${title} y mira sus productos.`;
                
                // Si el dueño subió un logo, lo usamos como imagen de preview
                if (storeData.logo_url) {
                    image = storeData.logo_url;
                }
            }
        }
    } catch (e) {
        console.error("Error obteniendo datos para preview:", e);
    }

    // ---------------------------------------------------------
    // GENERAR EL HTML FINAL
    // ---------------------------------------------------------
    // Leemos el index.html original de tu dominio para usarlo de plantilla
    // Esto asegura que siempre uses la última versión de tu frontend
    const htmlResponse = await fetch(`${MY_DOMAIN}/index.html`);
    let html = await htmlResponse.text();

    // Reemplazamos las variables __OG_...__ con los datos reales de la BD
    html = html
        .replace(/__OG_TITLE__/g, title)
        .replace(/__OG_DESCRIPTION__/g, description)
        .replace(/__OG_IMAGE__/g, image)
        .replace(/__OG_URL__/g, `https://${req.headers.host}${req.url}`)
        // Tags extra para Twitter
        .replace(/__TWITTER_TITLE__/g, title)
        .replace(/__TWITTER_DESCRIPTION__/g, description)
        .replace(/__TWITTER_IMAGE__/g, image);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
}
