export const reader = {
  fallbackTitle: 'Book',
  fileMissing:
    'This book’s file is missing from our library. Nothing is wrong with your membership — please report it and we will restore it.',
  noLongerAvailable: 'This book is no longer available.',
  unableToOpen: 'Unable to open this book.',
  pdfNotDisplayed: 'This PDF could not be displayed.',
  couldNotBeOpened: 'This book could not be opened.',
  fileUpdated:
    'This book’s file has been updated. Try again to open the new one — and download it again to keep it offline.',
  removeDownloadTitle: 'Remove download?',
  removeDownloadMessage: (title: string) =>
    `${title} will stay in your library but need a connection to open.`,
  downloadFailedTitle: 'Download failed',
  downloadFailedMessage:
    'The book could not be saved for offline reading. Please try again.',
  showReadingControls: 'Show reading controls',
  loadingBook: 'Loading book',
  closeTheBook: 'Close the book',
  readingOptions: 'Reading options',
  pageShort: (page: number, total: number) => `P. ${page} OF ${total}`,
  pageStatus: (page: number, total: number, percent: number) =>
    `PAGE ${page} OF ${total} · ${percent}%`,
  dragHint: 'DRAG THE PAGE FROM ANYWHERE',
  error: {
    title: 'This page didn’t arrive.',
    savedAtPage: (page: number) =>
      `Your place is saved at page ${page}. Check your connection and try again.`,
    saved: 'Your place is saved. Check your connection and try again.',
    readDownloaded: 'Read downloaded pages',
  },
  locked: {
    youWereOnPage: (page: number) => `You were on page ${page}. It is saved.`,
    renew: 'Renew membership',
    backToLibrary: 'Back to library',
  },
  sheet: {
    title: 'Reading',
    readingMode: 'Reading mode',
    pageTone: 'Page tone',
    brightness: 'Brightness',
    zoom: 'Zoom',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    goToPage: 'Go to page',
    pageRange: (total: number) => `1 – ${total}`,
    pageNumber: 'Page number',
    bookmarked: 'Bookmarked',
    bookmark: 'Bookmark',
    pageN: (page: number) => `Page ${page}`,
    thisPage: 'This page',
    downloading: 'Downloading…',
    downloaded: 'Downloaded',
    download: 'Download',
    preparing: 'Preparing…',
    onThisDevice: 'On this device',
    keepOffline: 'Keep a copy offline',
  },
  modes: {
    flip: {
      label: 'Flip',
      tag: 'PAPER FLIP',
      hint: 'Pages fold over on the spine, the way paper does',
    },
    swipe: {
      label: 'Swipe',
      tag: 'PAGE BY PAGE',
      hint: 'One page at a time, turned sideways',
    },
    scroll: {
      label: 'Scroll',
      tag: 'ONE COLUMN',
      hint: 'The book runs as one column you scroll',
    },
  },
  tones: { paper: 'Paper', sepia: 'Sepia', midnight: 'Midnight' },
};
