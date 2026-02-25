-- Default categories
INSERT INTO categories (name, slug, description, display_order) VALUES
    ('Custom Cakes', 'custom-cakes', 'Beautiful custom cakes for every occasion', 1),
    ('Macarons', 'macarons', 'Delicate French macarons in various flavors', 2),
    ('Cupcake Collections', 'cupcake-collections', 'Curated cupcake collections', 3);

-- Default site settings
INSERT INTO site_settings (key, value) VALUES
    ('hero_title', 'Delight in every bite!'),
    ('hero_subtitle', 'Sharing food, lifestyle & everyday joy. Cakes, cooking, wellness & real moments.'),
    ('about_text', 'Welcome to Mnet''s World! I am a passionate food and lifestyle creator originally from Cameroon, now based in the USA. I share my love for baking, cooking, wellness, and community through this space.'),
    ('whatsapp_number', '16735474730'),
    ('contact_email', 'mnetlifestyle1@gmail.com'),
    ('contact_phone', '+1 673 547 4730'),
    ('facebook_url', 'https://www.facebook.com/profile.php?id=100095233376780'),
    ('currency_symbol', '$'),
    ('fcfa_rate', '600');
