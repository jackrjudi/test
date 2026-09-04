const DB_NAME = 'photo-gallery';
const STORE_NAME = 'photos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function addPhoto(photo) {
  return withStore('readwrite', (store) => store.put(photo));
}

function deletePhoto(id) {
  return withStore('readwrite', (store) => store.delete(id));
}

function getAllPhotos() {
  return new Promise(async (resolve, reject) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const gallery = document.getElementById('gallery');
const emptyState = document.getElementById('empty-state');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxDelete = document.getElementById('lightbox-delete');

let activePhotoId = null;

function updateEmptyState() {
  emptyState.hidden = gallery.children.length > 0;
}

function renderPhoto(photo) {
  const url = URL.createObjectURL(photo.blob);
  const figure = document.createElement('figure');
  const img = document.createElement('img');
  img.src = url;
  img.alt = photo.name;
  figure.appendChild(img);
  figure.dataset.id = photo.id;
  figure.addEventListener('click', () => openLightbox(photo.id, url));
  gallery.appendChild(figure);
}

function openLightbox(id, url) {
  activePhotoId = id;
  lightboxImg.src = url;
  lightbox.hidden = false;
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  activePhotoId = null;
}

async function handleFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const photo = { id: crypto.randomUUID(), name: file.name, blob: file };
    await addPhoto(photo);
    renderPhoto(photo);
  }
  updateEmptyState();
}

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = '';
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

lightboxClose.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

lightboxDelete.addEventListener('click', async () => {
  if (!activePhotoId) return;
  await deletePhoto(activePhotoId);
  const figure = gallery.querySelector(`figure[data-id="${activePhotoId}"]`);
  if (figure) figure.remove();
  updateEmptyState();
  closeLightbox();
});

(async function init() {
  const photos = await getAllPhotos();
  photos.forEach(renderPhoto);
  updateEmptyState();
})();
