import React from 'react';
import { Dorama } from '../types';
import { PlayCircle, Heart, Plus, CheckCircle2, Trash2, MinusCircle, PlusCircle, Film, Edit3, Star, Check } from 'lucide-react';

interface DoramaListProps {
  title: string;
  doramas: Dorama[];
  type: 'favorites' | 'watching' | 'completed';
  onAdd: () => void;
  onUpdate?: (dorama: Dorama) => void;
  onDelete?: (doramaId: string) => void;
  onEdit?: (dorama: Dorama) => void; 
}

const DoramaList: React.FC<DoramaListProps> = ({ title, doramas, type, onAdd, onUpdate, onDelete, onEdit }) => {
  const getIcon = () => {
    switch (type) {
      case 'favorites': return <Heart className="w-8 h-8 mr-3 text-primary-600 fill-current" />;
      case 'completed': return <CheckCircle2 className="w-8 h-8 mr-3 text-green-600" />;
      default: return <PlayCircle className="w-8 h-8 mr-3 text-primary-600" />;
    }
  };

  const getEmptyMessage = () => {
    switch (type) {
      case 'favorites': return 'Sua lista de favoritos está vazia.';
      case 'completed': return 'Você ainda não marcou nenhum dorama como concluído.';
      default: return 'Você não está assistindo nada no momento.';
    }
  };

  const handleIncrementEpisode = (e: React.MouseEvent, dorama: Dorama) => {
    e.stopPropagation();
    if (onUpdate) {
      onUpdate({ ...dorama, episodesWatched: (dorama.episodesWatched || 0) + 1 });
    }
  };

  const handleDecrementEpisode = (e: React.MouseEvent, dorama: Dorama) => {
    e.stopPropagation();
    if (onUpdate && (dorama.episodesWatched || 0) > 0) {
      onUpdate({ ...dorama, episodesWatched: (dorama.episodesWatched || 0) - 1 });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (onDelete) {
        onDelete(id);
    }
  };

  const handleEditClick = (e: React.MouseEvent, dorama: Dorama) => {
      e.preventDefault();
      e.stopPropagation();
      if (onEdit) {
          onEdit(dorama);
      }
  };

  const renderStars = (count: number) => {
      return (
          <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                  <Heart 
                    key={star} 
                    className={`w-3 h-3 ${star <= count ? 'text-red-500 fill-red-500' : 'text-gray-300'}`} 
                  />
              ))}
          </div>
      );
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex justify-between items-center px-4 pt-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          {getIcon()}
          {title}
        </h2>
        <button 
          onClick={onAdd}
          className="bg-primary-600 text-white p-2.5 rounded-full hover:bg-primary-700 shadow-lg transition-colors flex items-center gap-2"
          title="Adicionar"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {doramas.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm mx-4 border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-6">
            {getEmptyMessage()}
          </p>
          <button 
            onClick={onAdd}
            className="text-primary-700 font-bold text-xl hover:underline bg-primary-50 px-6 py-3 rounded-xl"
          >
            + Adicionar Novo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4">
          {doramas.map((dorama) => (
            <div key={dorama.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-200 relative">
              <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-xl ${type === 'completed' ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-600'}`}>
                          {type === 'completed' ? <Check className="w-6 h-6" /> : <Film className="w-6 h-6" />}
                      </div>
                      <div>
                          <h3 className="font-bold text-gray-900 text-lg leading-tight">{dorama.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${type === 'completed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                 {dorama.genre || 'Dorama'}
                             </span>
                             {dorama.season && type === 'watching' && (
                                 <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                     T{dorama.season}
                                 </span>
                             )}
                          </div>
                          
                          {type === 'favorites' && dorama.rating && (
                              <div className="mt-2">
                                  {renderStars(dorama.rating)}
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex gap-1 -mr-2 -mt-2">
                    {onEdit && (
                        <button 
                            type="button"
                            onClick={(e) => handleEditClick(e, dorama)}
                            className="text-gray-400 hover:text-blue-500 p-2 transition-colors"
                        >
                            <Edit3 className="w-5 h-5" />
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            type="button"
                            onClick={(e) => handleDeleteClick(e, dorama.id)}
                            className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                  </div>
              </div>

              {type === 'watching' && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-700">Progresso</span>
                    <span className="text-sm text-gray-500 font-mono">
                         {dorama.episodesWatched || 0} / {dorama.totalEpisodes || 16} Ep
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                    <div 
                      className="bg-primary-500 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(((dorama.episodesWatched || 0) / (dorama.totalEpisodes || 16)) * 100, 100)}%` }}
                    ></div>
                  </div>
                  
                  {onUpdate && (
                      <div className="flex items-center justify-end gap-3 mt-1">
                          <button onClick={(e) => handleDecrementEpisode(e, dorama)} className="text-gray-400 hover:text-primary-600 p-1 bg-gray-50 rounded-lg border border-gray-200">
                              <MinusCircle className="w-6 h-6" />
                          </button>
                          <button onClick={(e) => handleIncrementEpisode(e, dorama)} className="text-white bg-primary-600 hover:bg-primary-700 p-1 rounded-lg shadow-sm">
                              <PlusCircle className="w-6 h-6" />
                          </button>
                      </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoramaList;