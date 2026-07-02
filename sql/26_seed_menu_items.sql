-- ─── Migration 26: Seed default menu items (runs only if table is empty) ──────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM menu_items LIMIT 1) THEN

    -- ── Breakfast: Healthy Breakfast ────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('breakfast', 'Healthy Breakfast', 'Liver',            '',    250, NULL,      1, true),
      ('breakfast', 'Healthy Breakfast', 'Githeri (Nyoyo)', '',    200, NULL,      2, true),
      ('breakfast', 'Healthy Breakfast', 'Matoke',           '',    200, NULL,      3, true),
      ('breakfast', 'Healthy Breakfast', 'Rolex',            '',    200, NULL,      4, true),
      ('breakfast', 'Healthy Breakfast', 'Uji Power',        '',    200, NULL,      5, true),
      ('breakfast', 'Healthy Breakfast', 'Eggs (Pair)',       '',    200, NULL,      6, true),
      ('breakfast', 'Healthy Breakfast', 'Mandazi (5 pcs)',  '',    100, NULL,      7, true),
      ('breakfast', 'Healthy Breakfast', 'Chapati (1 pc)',   '',    50,  NULL,      8, true);

    -- ── Breakfast: Full Traditional Breakfast Plate ────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('breakfast', 'Full Traditional Breakfast Plate', 'Full Traditional Breakfast Plate',
       'Chapati / mandazi / githeri, 2 Eggs, Liver, Uji Power, Tea or Coffee, and a glass of fresh juice with fruit slices',
       500, 'special', 1, true);

    -- ── Breakfast: English Breakfast ──────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('breakfast', 'English Breakfast', 'Omelette',           'Plain / Spanish',                       200, NULL, 1, true),
      ('breakfast', 'English Breakfast', 'Bacon',              '',                                       200, NULL, 2, true),
      ('breakfast', 'English Breakfast', 'Sausages (Pair)',    '',                                       100, NULL, 3, true),
      ('breakfast', 'English Breakfast', 'Pancakes',           '',                                       200, NULL, 4, true),
      ('breakfast', 'English Breakfast', 'Toast with Butter',  '',                                       200, NULL, 5, true),
      ('breakfast', 'English Breakfast', 'French Toast (3pc)', '',                                       200, NULL, 6, true),
      ('breakfast', 'English Breakfast', 'Cereals',            'Wheetabix or Cornflakes with milk',      150, NULL, 7, true),
      ('breakfast', 'English Breakfast', 'Oats Porridge',      'With honey & banana',                    200, NULL, 8, true);

    -- ── Breakfast: Full English Breakfast Plate ───────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('breakfast', 'Full English Breakfast Plate', 'Full English Breakfast Plate',
       '2 Eggs, 2 Sausages / Samosa / Bacon, Toast, Tea or Coffee, a glass of fresh juice and fruit slices',
       500, 'special', 1, true);

    -- ── Mains ─────────────────────────────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('mains', 'Main Dishes', '¼ Traditional Chicken',      'Free range chicken — wet fry, dry fry, pan fry, stew or boiled',                                                            600,  'popular', 1,  true),
      ('mains', 'Main Dishes', '1 Full Traditional Chicken', 'Free range chicken — wet fry, dry fry, pan fry, stew or boiled',                                                            2400, 'special', 2,  true),
      ('mains', 'Main Dishes', '¼ African Beef',             'Tender beef cubes cooked with local and natural spices — wetfry, pan fry, stew or boiled',                                                      600,  'popular', 3,  true),
      ('mains', 'Main Dishes', '¼ Goat Meat',                'Soft, flavourful goat meat cooked the local way — wetfry, pan fry, stew or boiled',                                                             600,  NULL,      4,  true),
      ('mains', 'Main Dishes', '¼ Pork',                     'Juicy pork prepared with rich seasoning — wetfry, pan fry, stew or boiled',                                                                     600,  NULL,      5,  true),
      ('mains', 'Main Dishes', 'Whole Tilapia',              'Fried and served with traditional tomato coriander sauce — wet fry, dry fry, boiled or coconut',                                                800,  'popular', 6,  true),
      ('mains', 'Main Dishes', 'Fish Fingers / Fish Fillet', 'Crispy, well seasoned fish fingers served with a choice of potato wedges, fries or vegetable rice, plus a side of steamed vegetables',         950,  NULL,      7,  true),
      ('mains', 'Main Dishes', '¼ Farm Chicken (Broiler)',   'Tender broiler chicken cooked to perfection — full of flavour',                                                                                 500,  NULL,      8,  true),
      ('mains', 'Main Dishes', 'Chicken Pilau',              'Aromatic rice prepared with tender chicken and mild, flavourful spices',                                                                        700,  'popular', 9,  true),
      ('mains', 'Main Dishes', 'Beef Pilau',                 'Spiced rice cooked with juicy beef for a rich, savoury taste',                                                                                  700,  'popular', 10, true);

    -- ── Snacks: Sharing Bites ─────────────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('snacks', 'Sharing Bites', 'BBQ Chicken Wings',    '', 600, 'popular', 1, true),
      ('snacks', 'Sharing Bites', 'Poussin Chicken Wings','', 600, NULL,      2, true),
      ('snacks', 'Sharing Bites', 'Bhajia',               '', 300, NULL,      3, true),
      ('snacks', 'Sharing Bites', 'Masala Chips',         '', 300, 'popular', 4, true),
      ('snacks', 'Sharing Bites', 'Plain Chips',          '', 200, NULL,      5, true),
      ('snacks', 'Sharing Bites', 'Beef Samosas (3pc)',   '', 150, NULL,      6, true),
      ('snacks', 'Sharing Bites', 'Kebab',                '', 150, NULL,      7, true),
      ('snacks', 'Sharing Bites', 'Sausages (2pc)',        '', 150, NULL,      8, true);

    -- ── Drinks: Beverages ─────────────────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('drinks', 'Beverages', 'Fresh Juices', 'Cocktail, Passion',                                                                           250, 'popular', 1, true),
      ('drinks', 'Beverages', 'Coffee',       'Black or White',                                                                              200, NULL,      2, true),
      ('drinks', 'Beverages', 'Tea',          'Kenyan, Masala, Black, Cinnamon, Ginger, Rosemary, Lemongrass',                               200, NULL,      3, true);

    -- ── Drinks: Fruits & Salad ────────────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('drinks', 'Fruits & Salad', 'Fresh Fruit Plate', 'Seasonal fruits',                                                                               150, NULL, 1, true),
      ('drinks', 'Fruits & Salad', 'Mixed Fruit Salad', 'Mango, Pineapple, Watermelon, Banana, Papaya. Add yoghurt or honey topping for KSh 150',        250, NULL, 2, true);

    -- ── Sides: More Sides ─────────────────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('sides', 'More Sides', 'Ugali Brown',   '', 200, NULL, 1, true),
      ('sides', 'More Sides', 'Fried Rice',    '', 200, NULL, 2, true),
      ('sides', 'More Sides', 'Potato Wedges', '', 300, NULL, 3, true),
      ('sides', 'More Sides', 'Bhajia',        '', 300, NULL, 4, true),
      ('sides', 'More Sides', 'Chips Masala',  '', 300, NULL, 5, true);

    -- ── Sides: Vegetables ─────────────────────────────────────────────────────
    INSERT INTO menu_items (tab, category, name, description, price, tag, position, active) VALUES
      ('sides', 'Vegetables', 'Osuga',  '',             200, NULL, 1, true),
      ('sides', 'Vegetables', 'Apoth',  '',             200, NULL, 2, true),
      ('sides', 'Vegetables', 'Sukuma', 'Complimentary',  0, NULL, 3, true);

  END IF;
END $$;
