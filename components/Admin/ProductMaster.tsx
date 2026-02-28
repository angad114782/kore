import React, { useState, useEffect } from "react";
import { 
  Package, 
  Tag, 
  DollarSign, 
  Users, 
  Image as ImageIcon, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X,
  Factory,
  Weight
} from "lucide-react";
import { AssortmentType, Article } from "../../types";
import { ASSORTMENTS } from "../../constants";
import SearchableSelect from "../UI/SearchableSelect";

interface ProductMasterProps {
  addArticle: (article: Article) => void;
}

const ProductMaster: React.FC<ProductMasterProps> = ({ addArticle }) => {
  // Form State
  const [formData, setFormData] = useState({
    artname: "",
    soleColor: "",
    mrp: 0,
    gender: AssortmentType.MEN,
    assortmentId: ASSORTMENTS[0].id,
    status: "AVAILABLE" as "AVAILABLE" | "WISHLIST",
    wishlistDate: "",
    manufacturer: "",
    unit: "Pairs",
    category: "",
    brand: "",
    image: null as File | null,
    imagePreview: "",
  });

  // Dynamic parameters (Size and Color)
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState("");

  // Category and Brand states (Persisted to localStorage for demo)
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("kore_categories");
    return saved ? JSON.parse(saved) : ["Footwear", "Apparel", "Accessories"];
  });

  const [brands, setBrands] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem("kore_brands");
    return saved ? JSON.parse(saved) : {
      "Footwear": ["Nike", "Adidas", "Puma", "Reebok"],
      "Apparel": ["Levis", "Zara", "H&M"],
      "Accessories": ["Titan", "Casio"]
    };
  });

  useEffect(() => {
    localStorage.setItem("kore_categories", JSON.stringify(categories));
    localStorage.setItem("kore_brands", JSON.stringify(brands));
  }, [categories, brands]);

  // Handlers for Category
  const handleAddCategory = (cat: string) => {
    if (!categories.includes(cat)) {
      setCategories([...categories, cat]);
      setBrands({ ...brands, [cat]: [] });
    }
  };

  const handleDeleteCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
    const newBrands = { ...brands };
    delete newBrands[cat];
    setBrands(newBrands);
    if (formData.category === cat) {
      setFormData({ ...formData, category: "", brand: "" });
    }
  };

  // Handlers for Brand
  const handleAddBrand = (brand: string) => {
    if (!formData.category) return alert("Please select a category first");
    const catBrands = brands[formData.category] || [];
    if (!catBrands.includes(brand)) {
      setBrands({
        ...brands,
        [formData.category]: [...catBrands, brand]
      });
    }
  };

  const handleDeleteBrand = (brand: string) => {
    if (!formData.category) return;
    setBrands({
      ...brands,
      [formData.category]: brands[formData.category].filter(b => b !== brand)
    });
    if (formData.brand === brand) {
      setFormData({ ...formData, brand: "" });
    }
  };

  // Image handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const addColor = () => {
    if (customColor && !selectedColors.includes(customColor)) {
      setSelectedColors([...selectedColors, customColor]);
      setCustomColor("");
    }
  };

  const removeColor = (color: string) => {
    setSelectedColors(selectedColors.filter(c => c !== color));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.artname || !formData.category || !formData.brand) {
      return alert("Please fill all required fields");
    }

    const newArticle: Article = {
      id: `art-${Date.now()}`,
      sku: `KK-${formData.gender.charAt(0)}-${formData.artname.replace(/\s+/g, '').toUpperCase()}-${Date.now().toString().slice(-4)}`,
      name: formData.artname,
      category: formData.gender, 
      productCategory: formData.category,
      brand: formData.brand,
      assortmentId: formData.assortmentId,
      pricePerPair: formData.mrp,
      mrp: formData.mrp,
      soleColor: formData.soleColor,
      imageUrl: formData.imagePreview || "https://picsum.photos/400/400",
      status: formData.status,
      expectedDate: formData.status === "WISHLIST" ? formData.wishlistDate : "",
      manufacturer: formData.manufacturer,
      unit: formData.unit,
      selectedSizes: selectedSizes,
      selectedColors: selectedColors,
    };

    addArticle(newArticle);
    alert("Product Created Successfully!");
    
    // Reset form
    setFormData({
      artname: "",
      soleColor: "",
      mrp: 0,
      gender: AssortmentType.MEN,
      assortmentId: ASSORTMENTS[0].id,
      status: "AVAILABLE",
      wishlistDate: "",
      manufacturer: "",
      unit: "Pairs",
      category: "",
      brand: "",
      image: null,
      imagePreview: "",
    });
    setSelectedSizes([]);
    setSelectedColors([]);
  };

  // Available Sizes for Parameter selection
  const availableSizes = ["4", "5", "6", "7", "8", "9", "10", "11", "12"];

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
            <Package size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Master</h2>
            <p className="text-slate-500 text-xs font-medium">Create and manage your product catalogue centrally</p>
          </div>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit} className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 min-h-full">
            
            {/* Col 1: Core Details (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-8 relative">
              <div className="hidden lg:block absolute -right-6 top-0 bottom-0 w-px bg-slate-100" />
              
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Tag size={16} className="text-indigo-500" /> Core Information
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Article Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Urban Runner X1"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-800"
                      value={formData.artname}
                      onChange={(e) => setFormData({ ...formData, artname: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Sole Color
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. White"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-800"
                        value={formData.soleColor}
                        onChange={(e) => setFormData({ ...formData, soleColor: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        MRP (₹) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 1999"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-indigo-700"
                        value={formData.mrp || ""}
                        onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Gender Audience <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                      {Object.values(AssortmentType).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFormData({ ...formData, gender: g })}
                          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                            formData.gender === g 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                            : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CheckCircle2 size={16} className="text-indigo-500" /> Attributes
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`w-11 h-11 rounded-xl border font-bold text-sm transition-all flex items-center justify-center ${
                            selectedSizes.includes(size)
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-slate-800"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Product Colors
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Crimson Red"
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-sm transition-all text-slate-800"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                      />
                      <button
                        type="button"
                        onClick={addColor}
                        className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 flex items-center justify-center"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    {selectedColors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[50px] items-start">
                        {selectedColors.map(color => (
                          <span 
                            key={color} 
                            className="px-3 py-1.5 bg-white text-indigo-700 border border-indigo-100 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                            {color}
                            <X size={12} className="cursor-pointer text-slate-400 hover:text-rose-500 ml-1" onClick={() => removeColor(color)} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Col 2: Taxonomy & Classification (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-8 relative">
              <div className="hidden lg:block absolute -right-6 top-0 bottom-0 w-px bg-slate-100" />
              
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Layers size={16} className="text-indigo-500" /> Taxonomy
                </h3>
                
                <div className="space-y-4">
                  <SearchableSelect
                    label="Category"
                    options={categories}
                    value={formData.category}
                    onChange={(val) => setFormData({ ...formData, category: val, brand: "" })}
                    onAdd={handleAddCategory}
                    onDelete={handleDeleteCategory}
                    placeholder="Select Category"
                    required
                  />

                  <SearchableSelect
                    label="Brand"
                    options={formData.category ? (brands[formData.category] || []) : []}
                    value={formData.brand}
                    onChange={(val) => setFormData({ ...formData, brand: val })}
                    onAdd={handleAddBrand}
                    onDelete={handleDeleteBrand}
                    placeholder={formData.category ? "Select Brand" : "Select Category First"}
                    required
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Assortment Mix <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 transition-all cursor-pointer"
                      value={formData.assortmentId}
                      onChange={(e) => setFormData({ ...formData, assortmentId: e.target.value })}
                    >
                      {ASSORTMENTS.map((as) => (
                        <option key={as.id} value={as.id}>{as.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Factory size={16} className="text-indigo-500" /> Manufacturing
                </h3>
                
                <div className="space-y-4">
                   <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-800 transition-all"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Base Unit
                    </label>
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 transition-all cursor-pointer"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option>Pairs</option>
                      <option>Pcs</option>
                      <option>Boxes</option>
                      <option>Cartons</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Col 3: Media & Status (3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-8">
              
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <ImageIcon size={16} className="text-indigo-500" /> Primary Media
                </h3>
                
                <div className="relative group">
                  <div className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 group-hover:bg-indigo-50/50">
                    {formData.imagePreview ? (
                      <img src={formData.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <>
                        <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform mb-3">
                          <ImageIcon size={28} />
                        </div>
                        <p className="text-xs text-slate-500 font-bold">Click to upload image</p>
                        <p className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageChange}
                  />
                  {formData.imagePreview && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: null, imagePreview: "" })}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur text-rose-500 hover:bg-rose-50 rounded-xl shadow-md border border-slate-100 transition-all hover:scale-105"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Clock size={16} className="text-indigo-500" /> Listing Status
                </h3>
                
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "AVAILABLE" })}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                      formData.status === "AVAILABLE"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <CheckCircle2 size={18} className={formData.status === "AVAILABLE" ? "text-emerald-500" : "text-slate-400"} />
                    Active / Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "WISHLIST" })}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                      formData.status === "WISHLIST"
                      ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    <Clock size={18} className={formData.status === "WISHLIST" ? "text-amber-500" : "text-slate-400"} />
                    Coming Soon / Wishlist
                  </button>
                  
                  {formData.status === "WISHLIST" && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Expected Availability
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 font-medium text-slate-700 transition-all"
                        value={formData.wishlistDate}
                        onChange={(e) => setFormData({ ...formData, wishlistDate: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
              
            </div>
            
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 md:px-8 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-400 font-medium hidden sm:block">
            Please review all details before saving. Required fields are marked with <span className="text-rose-500">*</span>
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
            >
              Discard Clear
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <CheckCircle2 size={18} />
              Save Product
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductMaster;
