export const ORDER_PHONE = '0726566795';
export const ROOM_SERVICE_FEE = 100;
export const DELIVERY_FEE = 200;

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  tag?: 'popular' | 'special';
  image_url?: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  tab: 'breakfast' | 'mains' | 'snacks' | 'drinks' | 'sides';
  description?: string;
  items: MenuItem[];
};

export const MENU_TABS: { id: MenuCategory['tab']; label: string; emoji: string }[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'mains',     label: 'Main Dishes', emoji: '🍽️' },
  { id: 'snacks',    label: 'Sharing Bites', emoji: '🍗' },
  { id: 'drinks',    label: 'Drinks & Fruits', emoji: '🥤' },
  { id: 'sides',     label: 'Sides', emoji: '🥗' },
];

export const MENU_DATA: MenuCategory[] = [
  {
    id: 'healthy',
    name: 'Healthy Breakfast',
    tab: 'breakfast',
    items: [
      { id: 'h1', name: 'Liver',            price: 250 },
      { id: 'h2', name: 'Githeri (Nyoyo)', price: 200 },
      { id: 'h3', name: 'Matoke',           price: 200 },
      { id: 'h4', name: 'Rolex',            price: 200 },
      { id: 'h5', name: 'Uji Power',        price: 200 },
      { id: 'h6', name: 'Eggs (Pair)',       price: 200 },
      { id: 'h7', name: 'Mandazi (5 pcs)',  price: 100 },
      { id: 'h8', name: 'Chapati (1 pc)',   price: 50  },
    ],
  },
  {
    id: 'trad-plate',
    name: 'Full Traditional Breakfast Plate',
    tab: 'breakfast',
    items: [
      {
        id: 'tp1',
        name: 'Full Traditional Breakfast Plate',
        price: 500,
        description: 'Chapati / mandazi / githeri, 2 Eggs, Liver, Uji Power, Tea or Coffee, and a glass of fresh juice with fruit slices',
        tag: 'special',
      },
    ],
  },
  {
    id: 'english',
    name: 'English Breakfast',
    tab: 'breakfast',
    items: [
      { id: 'e1', name: 'Omelette',          price: 200, description: 'Plain / Spanish' },
      { id: 'e2', name: 'Bacon',             price: 200 },
      { id: 'e3', name: 'Sausages (Pair)',   price: 100 },
      { id: 'e4', name: 'Pancakes',          price: 200 },
      { id: 'e5', name: 'Toast with Butter', price: 200 },
      { id: 'e6', name: 'French Toast (3pc)', price: 200 },
      { id: 'e7', name: 'Cereals',           price: 150, description: 'Wheetabix or Cornflakes with milk' },
      { id: 'e8', name: 'Oats Porridge',     price: 200, description: 'With honey & banana' },
    ],
  },
  {
    id: 'eng-plate',
    name: 'Full English Breakfast Plate',
    tab: 'breakfast',
    items: [
      {
        id: 'ep1',
        name: 'Full English Breakfast Plate',
        price: 500,
        description: '2 Eggs, 2 Sausages / Samosa / Bacon, Toast, Tea or Coffee, a glass of fresh juice and fruit slices',
        tag: 'special',
      },
    ],
  },
  {
    id: 'mains',
    name: 'Main Dishes',
    tab: 'mains',
    description: 'Served with vegetables and a choice of ugali, rice or chapati',
    items: [
      { id: 'm1', name: '¼ Traditional Chicken',     price: 600,  description: 'Free range chicken — wet fry, dry fry, pan fry, stew or boiled', tag: 'popular' },
      { id: 'm2', name: '1 Full Traditional Chicken', price: 2400, description: 'Free range chicken — wet fry, dry fry, pan fry, stew or boiled', tag: 'special' },
      { id: 'm3', name: '¼ African Beef',            price: 600,  description: 'Tender beef cubes cooked with local and natural spices — wetfry, pan fry, stew or boiled', tag: 'popular' },
      { id: 'm4', name: '¼ Goat Meat',               price: 600,  description: 'Soft, flavourful goat meat cooked the local way — wetfry, pan fry, stew or boiled' },
      { id: 'm5', name: '¼ Pork',                    price: 600,  description: 'Juicy pork prepared with rich seasoning — wetfry, pan fry, stew or boiled' },
      { id: 'm6', name: 'Whole Tilapia',             price: 800,  description: 'Fried and served with traditional tomato coriander sauce — wet fry, dry fry, boiled or coconut', tag: 'popular' },
      { id: 'm7', name: 'Fish Fingers / Fish Fillet', price: 950,  description: 'Crispy, well seasoned fish fingers served with a choice of potato wedges, fries or vegetable rice, plus a side of steamed vegetables' },
      { id: 'm8', name: '¼ Farm Chicken (Broiler)',  price: 500,  description: 'Tender broiler chicken cooked to perfection — full of flavour' },
      { id: 'm9', name: 'Chicken Pilau',             price: 700,  description: 'Aromatic rice prepared with tender chicken and mild, flavourful spices', tag: 'popular' },
      { id: 'm10', name: 'Beef Pilau',               price: 700,  description: 'Spiced rice cooked with juicy beef for a rich, savoury taste', tag: 'popular' },
    ],
  },
  {
    id: 'sharing',
    name: 'Sharing Bites',
    tab: 'snacks',
    items: [
      { id: 's1', name: 'BBQ Chicken Wings',    price: 600, tag: 'popular' },
      { id: 's2', name: 'Poussin Chicken Wings', price: 600 },
      { id: 's3', name: 'Bhajia',               price: 300 },
      { id: 's4', name: 'Masala Chips',         price: 300, tag: 'popular' },
      { id: 's5', name: 'Plain Chips',          price: 200 },
      { id: 's6', name: 'Beef Samosas (3pc)',   price: 150 },
      { id: 's7', name: 'Kebab',                price: 150 },
      { id: 's8', name: 'Sausages (2pc)',        price: 150 },
    ],
  },
  {
    id: 'beverages',
    name: 'Beverages',
    tab: 'drinks',
    items: [
      { id: 'b1', name: 'Fresh Juices', price: 250, description: 'Cocktail, Passion', tag: 'popular' },
      { id: 'b2', name: 'Coffee',       price: 200, description: 'Black or White' },
      { id: 'b3', name: 'Tea',          price: 200, description: 'Kenyan, Masala, Black, Cinnamon, Ginger, Rosemary, Lemongrass' },
    ],
  },
  {
    id: 'fruits',
    name: 'Fruits & Salad',
    tab: 'drinks',
    items: [
      { id: 'f1', name: 'Fresh Fruit Plate', price: 150, description: 'Seasonal fruits' },
      { id: 'f2', name: 'Mixed Fruit Salad', price: 250, description: 'Mango, Pineapple, Watermelon, Banana, Papaya. Add yoghurt or honey topping for KSh 150' },
    ],
  },
  {
    id: 'sides',
    name: 'More Sides',
    tab: 'sides',
    items: [
      { id: 'si1', name: 'Ugali Brown',    price: 200 },
      { id: 'si2', name: 'Fried Rice',     price: 200 },
      { id: 'si3', name: 'Potato Wedges',  price: 300 },
      { id: 'si4', name: 'Bhajia',         price: 300 },
      { id: 'si5', name: 'Chips Masala',   price: 300 },
    ],
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    tab: 'sides',
    items: [
      { id: 'v1', name: 'Osuga',  price: 200 },
      { id: 'v2', name: 'Apoth',  price: 200 },
      { id: 'v3', name: 'Sukuma', price: 0, description: 'Complimentary' },
    ],
  },
];
