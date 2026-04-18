
import React, { useState } from 'react';
import { Search, Plus, Minus, Database, ArrowUpCircle, ArrowDownCircle, AlertTriangle, X, ChevronDown, ImageIcon, Package, Layers } from 'lucide-react';
import { Inventory, Article } from '../../types';
import { getImageUrl } from '../../utils/imageUtils';

interface MasterInventoryProps {
  inventory: Inventory[];
  articles: Article[];
  onInward: (articleId: string, cartons: number) => void;
  onOutward: (articleId: string, cartons: number) => void;
}

const MasterInventory: React.FC<MasterInventoryProps> = ({ inventory, articles, onInward, onOutward }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [movementType, setMovementType] = useState<'INWARD' | 'OUTWARD'>('INWARD');
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [qty, setQty] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredInventory = inventory.filter(inv => {
    const article = articles.find(a => a.id === inv.articleId);
    return article?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           article?.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedArticleId && qty > 0) {
      if (movementType === 'INWARD') {
        onInward(selectedArticleId, qty);
      } else {
        onOutward(selectedArticleId, qty);
      }
      setShowModal(false);
      setQty(0);
    }
  };

  const openMovementModal = (type: 'INWARD' | 'OUTWARD', articleId: string = '') => {
    setMovementType(type);
    setSelectedArticleId(articleId);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-50 rounded-xl">
             <Database className="text-indigo-600" size={24} />
           </div>
           <div>
             <h3 className="text-xl font-bold text-slate-900">Company Master Stock</h3>
             <p className="text-sm text-slate-500">Track total physical warehouse inventory (Cartons)</p>
           </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Alert Threshold:</span>
            <input 
              type="number" 
              className="w-12 bg-transparent font-bold text-indigo-600 outline-none"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => openMovementModal('OUTWARD')}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg font-bold hover:bg-rose-100 transition-all"
            >
              <Minus size={18} />
              Stock Outward
            </button>
            <button 
              onClick={() => openMovementModal('INWARD')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={18} />
              Stock Inward
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredInventory.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Package className="mx-auto text-slate-200 mb-3" size={48} />
            <p className="text-slate-400 font-medium font-mono uppercase tracking-widest text-xs italic">No matching stock records</p>
          </div>
        )}

        {filteredInventory.map(inv => {
          const article = articles.find(a => a.id === inv.articleId)!;
          const isExpanded = expandedIds.has(article.id);
          const isLowStock = inv.availableStock < lowStockThreshold;
          const variantCount = article.variants?.length || 0;

          return (
            <div key={inv.articleId} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:border-indigo-200">
              {/* Parent Article Row */}
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => toggleExpand(article.id)}
              >
                <div className="relative shrink-0">
                  <img src={getImageUrl(article.imageUrl)} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-100" />
                  {isLowStock && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{article.name}</h4>
                    {isLowStock && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-tighter flex items-center gap-1">
                        <AlertTriangle size={8} /> Low Stock
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{article.sku}</p>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                      {variantCount} Variants
                    </span>
                  </div>
                </div>

                {/* Stock Summary Columns */}
                <div className="hidden lg:flex items-center gap-8 mr-4">
                  <div className="text-center w-24">
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Live Stock</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-lg font-black text-slate-800">{inv.availableStock}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ctns</span>
                    </div>
                  </div>
                  <div className="text-center w-24">
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Booked</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-lg font-black text-slate-800">{inv.reservedStock}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ctns</span>
                    </div>
                  </div>
                  <div className="text-center w-24 border-l border-slate-100 pl-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Physical</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-lg font-black text-slate-900">{inv.actualStock}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ctns</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                   <button 
                     onClick={() => openMovementModal('OUTWARD', article.id)}
                     className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                     title="Stock Outward"
                   >
                     <Minus size={18} />
                   </button>
                   <button 
                     onClick={() => openMovementModal('INWARD', article.id)}
                     className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                     title="Stock Inward"
                   >
                     <Plus size={18} />
                   </button>
                   <div className="w-px h-6 bg-slate-100 mx-1"></div>
                   <ChevronDown 
                     size={20} 
                     className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                   />
                </div>
              </div>

              {/* Mobile Stats Row */}
              <div className="lg:hidden grid grid-cols-3 gap-2 px-4 pb-4">
                <div className="bg-emerald-50/50 p-2 rounded-xl text-center">
                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Live Stock</p>
                  <p className="text-sm font-black text-slate-900">{inv.availableStock} <span className="text-[8px] text-slate-400">CTN</span></p>
                </div>
                <div className="bg-rose-50/50 p-2 rounded-xl text-center">
                  <p className="text-[8px] font-black text-rose-600 uppercase tracking-tighter">Booked</p>
                  <p className="text-sm font-black text-slate-900">{inv.reservedStock} <span className="text-[8px] text-slate-400">CTN</span></p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Physical</p>
                  <p className="text-sm font-black text-slate-900">{inv.actualStock} <span className="text-[8px] text-slate-400">CTN</span></p>
                </div>
              </div>

              {/* Variant Dropdown Content */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 animate-in slide-in-from-top-2 duration-300">
                   {variantCount === 0 ? (
                     <div className="p-8 text-center text-slate-400 italic text-xs font-medium">
                       No variants registered for this article.
                     </div>
                   ) : (
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100/50 border-b border-slate-100">
                             <tr>
                               <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Variant Details</th>
                               <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Color</th>
                               <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Live Stock</th>
                               <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Booked</th>
                               <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Physical</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {article.variants?.map(variant => {
                               // Calculate variant stock
                               const livePairs = Object.values(variant.sizeMap || {}).reduce((sum, s) => sum + (s.qty || 0), 0);
                               const bookedPairs = Object.values(variant.bookingMap || {}).reduce((sum, q) => sum + (q || 0), 0);
                               const physicalPairs = livePairs + bookedPairs;

                               // Convert to cartons (1 Ctn = 24 Pairs)
                               const liveCtns = Math.floor(livePairs / 24);
                               const bookedCtns = Math.floor(bookedPairs / 24);
                               const physicalCtns = Math.floor(physicalPairs / 24);

                                 return (
                                 <tr key={variant.id} className="hover:bg-white transition-colors group">
                                   <td className="px-6 py-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-0.5 shadow-sm group-hover:border-indigo-200 transition-colors">
                                           {(() => {
                                             const colorMedia = article.colorMedia || [];
                                             const matched = colorMedia.find(cm => cm.color.toLowerCase() === variant.color.toLowerCase());
                                             const vImg = (matched && matched.images && matched.images.length > 0) 
                                               ? matched.images[0].url 
                                               : (variant.images && variant.images.length > 0 ? variant.images[0] : article.imageUrl);
                                             
                                             return vImg ? (
                                               <img 
                                                 src={getImageUrl(vImg)} 
                                                 alt={variant.color} 
                                                 className="w-full h-full object-cover rounded-md"
                                               />
                                             ) : (
                                               <div className="w-full h-full rounded-md bg-slate-50 flex items-center justify-center">
                                                 <ImageIcon size={14} className="text-slate-300" />
                                               </div>
                                             );
                                           })()}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-slate-800">{variant.itemName || 'Standard Variant'}</p>
                                          <p className="text-[9px] font-mono text-slate-400 tracking-wider">SKU: {variant.sku || article.sku}</p>
                                        </div>
                                      </div>
                                   </td>
                                   <td className="px-6 py-3 text-center">
                                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-100 shadow-sm">
                                         <div 
                                           className="w-3 h-3 rounded-full border border-slate-200 shadow-inner" 
                                           style={{ backgroundColor: variant.color?.toLowerCase() || '#eee' }}
                                         />
                                         <span className="text-[10px] font-bold text-slate-600 uppercase">{variant.color}</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-3 text-center">
                                      <span className="text-sm font-black text-emerald-600">{liveCtns}</span>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Cartons</p>
                                   </td>
                                   <td className="px-6 py-3 text-center">
                                      <span className="text-sm font-black text-rose-500">{bookedCtns}</span>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Cartons</p>
                                   </td>
                                   <td className="px-6 py-3 text-center">
                                      <span className="text-sm font-black text-slate-800">{physicalCtns}</span>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Cartons</p>
                                   </td>
                                 </tr>
                               );
                             })}
                          </tbody>
                        </table>
                     </div>
                   )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Movement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${movementType === 'INWARD' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  {movementType === 'INWARD' ? (
                    <ArrowUpCircle className="text-emerald-600" size={32} />
                  ) : (
                    <ArrowDownCircle className="text-rose-600" size={32} />
                  )}
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Stock {movementType === 'INWARD' ? 'Inward' : 'Outward'} Movement
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                {movementType === 'INWARD' 
                  ? 'Record new production or purchase arrivals to the master warehouse.' 
                  : 'Record stock deduction due to sample issues, returns, or other manual removals.'}
              </p>
              
              <form onSubmit={handleMovementSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Article</label>
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={selectedArticleId}
                      onChange={(e) => setSelectedArticleId(e.target.value)}
                      required
                    >
                       <option value="">Choose an article...</option>
                       {articles.map(a => <option key={a.id} value={a.id}>{a.name} ({a.sku})</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Quantity (Cartons)</label>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={qty}
                      onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Note: 1 Carton = 24 Pairs</p>
                 </div>
                 <button 
                   className={`w-full text-white py-4 rounded-xl font-bold transition-all shadow-lg mt-4 ${
                     movementType === 'INWARD' 
                       ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' 
                       : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                   }`}
                 >
                   Confirm Stock {movementType === 'INWARD' ? 'Inward' : 'Outward'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default MasterInventory;
