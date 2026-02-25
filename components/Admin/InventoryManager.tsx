
import React, { useState } from 'react';
import { Plus, Search, Filter, ArrowUpDown, ChevronDown, CheckCircle } from 'lucide-react';
import { Inventory, Article } from '../../types';

interface InventoryManagerProps {
  inventory: Inventory[];
  articles: Article[];
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ inventory, articles }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInventory = inventory.filter(inv => {
    const article = articles.find(a => a.id === inv.articleId);
    return article?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           article?.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search SKU or Article Name..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all font-medium">
            <Filter size={18} />
            Filter
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium">
            <Plus size={18} />
            Add Stock
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Article Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actual Stock</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Reserved</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Available</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map(inv => {
                const article = articles.find(a => a.id === inv.articleId)!;
                const status = inv.availableStock > 20 ? 'In Stock' : inv.availableStock > 0 ? 'Low Stock' : 'Out of Stock';
                const statusColor = inv.availableStock > 20 ? 'bg-emerald-50 text-emerald-600' : inv.availableStock > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600';

                return (
                  <tr key={inv.articleId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={article.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                        <div>
                          <p className="font-bold text-slate-900">{article.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{article.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-700">{inv.actualStock}</span>
                      <p className="text-[10px] text-slate-400">Cartons</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-slate-600">{inv.reservedStock}</span>
                      <p className="text-[10px] text-slate-400">Cartons</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`font-bold px-2 py-0.5 rounded ${inv.availableStock < 10 ? 'text-red-600 bg-red-50' : 'text-indigo-600 bg-indigo-50'}`}>
                          {inv.availableStock}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{inv.availableStock * 24} Pairs</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 transition-colors">
                        Manage <ChevronDown size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;
