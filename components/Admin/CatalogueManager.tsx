
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Image as ImageIcon,
  Tag,
  Hash,
  ShoppingBag,
  Layers
} from 'lucide-react';
import { Article, AssortmentType } from '../../types';
import { ASSORTMENTS } from '../../constants';

interface CatalogueManagerProps {
  articles: Article[];
  addArticle: (article: Article) => void;
  updateArticle: (article: Article) => void;
  deleteArticle: (id: string) => void;
}

const CatalogueManager: React.FC<CatalogueManagerProps> = ({ 
  articles, 
  addArticle, 
  updateArticle, 
  deleteArticle 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: AssortmentType.MEN,
    pricePerPair: 0,
    imageUrl: '',
    assortmentId: ASSORTMENTS[0].id
  });

  const filteredArticles = articles.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (article?: Article) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        name: article.name,
        sku: article.sku,
        category: article.category,
        pricePerPair: article.pricePerPair,
        imageUrl: article.imageUrl,
        assortmentId: article.assortmentId
      });
    } else {
      setEditingArticle(null);
      setFormData({
        name: '',
        sku: '',
        category: AssortmentType.MEN,
        pricePerPair: 0,
        imageUrl: '',
        assortmentId: ASSORTMENTS[0].id
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newArticle: Article = {
      id: editingArticle ? editingArticle.id : `art-${Date.now()}`,
      ...formData
    };

    if (editingArticle) {
      updateArticle(newArticle);
    } else {
      addArticle(newArticle);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-50 rounded-xl">
             <Layers className="text-indigo-600" size={24} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-slate-900">Catalogue Management</h3>
             <p className="text-sm text-slate-500">Add or modify footwear articles in the global distribution list</p>
           </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search SKU or Name..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={18} />
            New Article
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Article Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assortment</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Price (Pr)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArticles.map(article => (
                <tr key={article.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={article.imageUrl || 'https://picsum.photos/seed/kore/200/200'} 
                        alt="" 
                        className="w-12 h-12 rounded-lg object-cover border border-slate-100" 
                      />
                      <div>
                        <p className="font-bold text-slate-900">{article.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-widest">{article.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      article.category === AssortmentType.MEN ? 'bg-indigo-50 text-indigo-600' :
                      article.category === AssortmentType.WOMEN ? 'bg-pink-50 text-pink-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {article.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {ASSORTMENTS.find(as => as.id === article.assortmentId)?.name || 'Standard'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-slate-800">₹{article.pricePerPair.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(article)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Delete ${article.name}? This will remove it from shop and inventory.`)) {
                            deleteArticle(article.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredArticles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No articles matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
               <h3 className="text-xl font-bold flex items-center gap-2">
                 {editingArticle ? <Edit2 size={20} /> : <Plus size={20} />}
                 {editingArticle ? 'Edit Article' : 'Add New Article'}
               </h3>
               <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                 <X size={24} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Tag size={12} /> Article Name
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Urban Runner"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Hash size={12} /> Unique SKU
                    </label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. KK-M-RUN-BLK"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                      <select 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value as AssortmentType})}
                      >
                        {Object.values(AssortmentType).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Assortment</label>
                      <select 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={formData.assortmentId}
                        onChange={e => setFormData({...formData, assortmentId: e.target.value})}
                      >
                        {ASSORTMENTS.map(as => (
                          <option key={as.id} value={as.id}>{as.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <ShoppingBag size={12} /> Price per Pair (INR)
                    </label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-indigo-600"
                      value={formData.pricePerPair}
                      onChange={e => setFormData({...formData, pricePerPair: parseInt(e.target.value) || 0})}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Note: Cartons will be calculated at 24x this price.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <ImageIcon size={12} /> Product Image URL
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    />
                  </div>
                  <div className="pt-2">
                    <div className="aspect-square bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
                       {formData.imageUrl ? (
                         <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                         <div className="text-center p-4">
                            <ImageIcon size={32} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-[10px] text-slate-400 uppercase font-black">Image Preview</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                >
                  {editingArticle ? 'Save Changes' : 'Create Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogueManager;
