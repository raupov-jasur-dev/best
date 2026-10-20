const SiteSetting = require('../models/SiteSetting');
const { fail, id, bool } = require('../utils/validation');
async function readPresentation() {
  try { return (await SiteSetting.findByPk('presentation'))?.value || { categories: [] }; }
  catch (e) {
    if (e.original?.code === '42P01' || e.parent?.code === '42P01') return { categories: [], migrationRequired: true };
    throw e;
  }
}
function applyPresentation(categories, settings) {
  const config = new Map((settings.categories || []).map(c => [c.id, c]));
  return categories.map(c => ({ ...(c.toJSON ? c.toJSON() : c), sortOrder: config.get(c.id)?.order ?? c.id,
    showOnHomepage: config.get(c.id)?.showOnHomepage ?? true })).sort((a,b) => a.sortOrder - b.sortOrder || a.id - b.id);
}
async function writePresentation(input, validIds) {
  if (!Array.isArray(input.categories) || input.categories.length > 200) throw fail('Kategoriyalar ro‘yxatini tekshiring.');
  const seen = new Set();
  const categories = input.categories.map((c, order) => {
    const categoryId = id(c.id);
    if (!validIds.includes(categoryId) || seen.has(categoryId)) throw fail('Kategoriya takrorlangan yoki mavjud emas.');
    seen.add(categoryId);
    return { id: categoryId, order, showOnHomepage: bool(c.showOnHomepage) };
  });
  try { await SiteSetting.upsert({ key: 'presentation', value: { categories } }); }
  catch (e) {
    if (e.original?.code === '42P01' || e.parent?.code === '42P01') throw fail('Taqdimot sozlamalari uchun baza migratsiyasi talab qilinadi.', 503, 'MIGRATION_REQUIRED');
    throw e;
  }
  return { categories };
}
module.exports = { readPresentation, applyPresentation, writePresentation };
