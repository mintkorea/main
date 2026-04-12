import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { Plus, X, ChevronLeft, Loader2, Edit2, Trash2 } from 'lucide-react';

// Firebase 환경 변수 설정
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'sungui-duty-app';

const App = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 입력 필드 상태
  const [editingId, setEditingId] = useState(null);
  const [category, setCategory] = useState('공지사항');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');

  // 1. 인증 로직 (RULE 3 준수)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 데이터 실시간 동기화 (RULE 1, 2 준수)
  useEffect(() => {
    if (!user) return;

    const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'notices');
    
    const unsubscribe = onSnapshot(postsCol, (snapshot) => {
      const postData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 복합 쿼리 대신 메모리 내 정렬 (RULE 2)
      postData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setPosts(postData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 글 등록 및 수정
  const handlePostSubmit = useCallback(async () => {
    if (!content.trim() || !author.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        // 수정 모드
        const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'notices', editingId);
        await updateDoc(postRef, {
          category,
          content,
          author,
          updatedAt: serverTimestamp()
        });
      } else {
        // 신규 등록
        const postsCol = collection(db, 'artifacts', appId, 'public', 'data', 'notices');
        await addDoc(postsCol, {
          category,
          content,
          author,
          createdAt: serverTimestamp(),
          userId: user.uid
        });
      }
      closeModal();
    } catch (err) {
      console.error("Submit Error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [content, author, category, user, isSubmitting, editingId]);

  // 삭제
  const handleDelete = async (postId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'notices', postId);
      await deleteDoc(postRef);
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const openEditModal = (post) => {
    setEditingId(post.id);
    setCategory(post.category);
    setContent(post.content);
    setAuthor(post.author);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setCategory('공지사항');
    setContent('');
    setAuthor('');
  };

  const getCategoryStyle = (cat) => {
    switch(cat) {
      case '공지사항': return "bg-rose-50 text-rose-600 border-rose-100";
      case '성의회관': return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case '의산연': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-30 bg-[#2d3e75] text-white px-4 py-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => window.location.href='index.html'} className="p-1 hover:bg-white/10 rounded-full transition-all">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black tracking-tight">인수인계 및 공지</h1>
        </div>
        <div className="text-[10px] font-bold opacity-70 text-right">
          Catholic Board System
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4">
        {/* 게시글 리스트 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="font-bold text-sm">데이터를 불러오고 있습니다</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-300 font-bold">등록된 게시글이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 transition-all active:scale-[0.98]">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getCategoryStyle(post.category)}`}>
                      {post.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '방금 전'}
                    </span>
                  </div>
                  {user && post.userId === user.uid && (
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(post)} className="p-1.5 text-slate-300 hover:text-blue-600 transition-all">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(post.id)} className="p-1.5 text-slate-300 hover:text-red-600 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-[15px] font-bold text-slate-800 leading-relaxed whitespace-pre-wrap mb-3">
                  {post.content}
                </div>
                <div className="flex justify-end items-center text-[12px] font-black text-slate-500">
                  <span className="bg-slate-100 px-2 py-1 rounded">작성자: {post.author}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 플로팅 버튼 */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#2d3e75] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={28} />
      </button>

      {/* 글쓰기/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-[#2d3e75] text-white flex justify-between items-center">
              <h2 className="font-black text-lg">{editingId ? '게시글 수정' : '새 메시지 작성'}</h2>
              <button onClick={closeModal} className="p-1 hover:bg-white/10 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase mb-2">카테고리</label>
                <div className="flex gap-2">
                  {['공지사항', '성의회관', '의산연'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black border transition-all ${
                        category === cat 
                        ? 'bg-[#2d3e75] text-white border-[#2d3e75]' 
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase mb-2">작성자 명</label>
                <input 
                  type="text" 
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="예: 홍길동 (C조)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#2d3e75] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase mb-2">내용</label>
                <textarea 
                  rows="5"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="전달사항 혹은 공지내용을 입력하세요."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#2d3e75] focus:outline-none transition-all resize-none"
                ></textarea>
              </div>

              <button 
                onClick={handlePostSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-[#facc15] text-[#422006] font-black rounded-xl shadow-lg hover:bg-yellow-400 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (editingId ? '수정하기' : '등록하기')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
