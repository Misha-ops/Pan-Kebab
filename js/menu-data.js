/* Fallback menu data — used only if the Netlify Function / Supabase
   backend isn't reachable yet (e.g. previewing index.html locally
   before deployment). Once the backend is live, this file is ignored —
   main.js always tries the live API first. Keep this in sync with
   supabase/schema.sql seed data if you want local preview to match. */
window.PAN_KEBAB_FALLBACK_MENU = [
  {
    id: "durum",
    category: "Kebab",
    name: "Düriim Kebab",
    price: 5.50,
    meat_options: "Kuriacie / Teľacie",
    description: "Bohato naplnený mäsom. Šťavnatý a plný chuti. Čerstvo pripravený.",
    image_url: "assets/img/durum.svg",
    is_placeholder: true,
    sort_order: 1
  },
  {
    id: "doner",
    category: "Kebab",
    name: "Döner Kebab",
    price: 6.50,
    meat_options: "Kuriacie / Teľacie",
    description: "Viac mäsa, viac chuti. Čerstvo pečená žemľa. Vyrobený s láskou.",
    image_url: "assets/img/doner.svg",
    is_placeholder: true,
    sort_order: 2
  },
  {
    id: "box",
    category: "Kebab",
    name: "Kebab Box",
    price: 8.00,
    meat_options: "Kuriacie / Teľacie",
    description: "Chrumkavé hranolky. Väčšia porcia. Viac sýtosti.",
    image_url: "assets/img/box.svg",
    is_placeholder: true,
    sort_order: 3
  },
  {
    id: "tanier",
    category: "Kebab",
    name: "Tanier Kebab",
    price: 8.00,
    meat_options: "Kuriacie / Teľacie",
    description: "Obrovská porcia. Maximum sýtosti. Maximum chuti.",
    image_url: "assets/img/tanier.svg",
    is_placeholder: true,
    sort_order: 4
  },
  {
    id: "baklava",
    category: "Dezert",
    name: "Baklava",
    price: 1.50,
    meat_options: null,
    description: "Pravá turecká baklava. Dokonalá bodka po kebabe. Sladká odmena po dobrom jedle.",
    image_url: "assets/img/baklava.svg",
    is_placeholder: true,
    sort_order: 5
  }
];
