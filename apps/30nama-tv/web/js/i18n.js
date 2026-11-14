(function () {
  var S = {
    en: {
      home: 'Home', search: 'Search', archive: 'Archive', settings: 'Settings', movies: 'Movies', series: 'Series', anime: 'Anime', account: 'Account',
      signIn: 'Sign in', scanTitle: 'Scan with your phone', step1: 'Open the camera', step2: 'Scan the code', step3: 'Confirm on 30nama.com',
      orVisit: 'Or visit 30nama.com/auth and enter', waiting: 'Waiting for scan…', expired: 'Code expired',
      guest: 'Continue as guest', refresh: 'New code', loading: 'Loading...', error: 'Something went wrong', retry: 'Retry',
      continueWatching: 'Continue watching', dismissWatchHint: 'Hold OK to remove', dismissWatchTitle: 'Remove from Continue Watching?', dismissWatch: 'Remove', dismissedWatch: 'Removed from Continue Watching', dismissWatchError: 'Couldn’t remove this title. Try again.', hero_header: 'Featured', new_releases: 'New releases', suggested: 'Suggested',
      top_10: 'Top 10', top10: 'Top 10',
      play: 'Play', resume: 'Resume', details: 'Details', episodes: 'Episodes', season: 'Season', seasons: 'seasons', episode: 'Episode', nowPlaying: 'Now playing', tryAgain: 'Please try again in a moment.', cast: 'Cast', featured: 'Featured',
      movie: 'Movie', persianSub: 'Persian subtitles', minLeft: 'min left', min: 'min', free: 'FREE', soon: 'SOON',
      loginRequired: 'Sign in to stream and continue watching', playLogin: 'Sign in to watch', noResults: 'No results', nothingFor: 'Nothing for',
      popularNow: 'Popular now', topResults: 'Top results', searchDelete: 'Delete last character', searchPh: 'Search movies, series, anime', kbHint: '◀ ▶ ▲ ▼ to type · Right to results',
      space: 'Space', clearK: 'Clear', browse: 'Browse', categories: 'Categories', genres: 'Genres', newest: 'Newest', year: 'Year', allYears: 'All years', noMatches: 'No matching titles in this batch.', noYearMatches: 'No titles found for this year.', findingYearMatches: 'Finding titles for this year…', recentActivity: 'Recently added & updated', digitalRelease: 'Release date', olderReleases: 'Older releases', noDigitalMatches: 'No matching playable titles in this batch.', recentlyAdded: 'Recently added', popular: 'Popular', updated: 'Updated', results: 'results',
      language: 'Language', logout: 'Sign out', login: 'Sign in (QR)', guestAcc: 'Guest', expires: 'Subscription expires', unknown: 'unknown', userType: 'Account type',
      playback: 'Playback', display: 'Display', about: 'About', defSubs: 'Default subtitles', subSize: 'Subtitle size', autoplay: 'Autoplay next episode', reduce: 'Reduce motion',
      on: 'On', off: 'Off', small: 'Small', medium: 'Medium', large: 'Large', sample: 'This is how subtitles will look.',
      version: 'Version', unofficial: 'Unofficial client for 30nama.com', apiHost: 'API host',
      skipIntro: 'Skip intro', skipRecap: 'Skip recap', nextEpisode: 'Next episode', playNow: 'Play now', credits: 'Credits', restartPlayback: 'Restart', titleStatus: 'Status', network: 'Network', runtime: 'Runtime', quality: 'Quality', audio: 'Audio', subtitles: 'Subtitles',
      english: 'English', persian: 'Persian', noStream: 'No stream available', loadMore: 'Load more',
      exitTitle: 'Exit 30nama?', exitBody: 'You can come back any time.', exit: 'Exit', cancel: 'Cancel', logoutTitle: 'Sign out?', logoutBody: 'You will need to scan a new code to sign in again.',
      hintPlayer: '▲ Audio & subtitles  ·  OK Play/Pause', hintPlayerEps: '▲ Audio & subtitles  ·  OK Play/Pause  ·  ▼ Episodes',
      welcome: 'Welcome', subFailed: 'Subtitle failed', playErr: 'Playback error',
      archiveIntro: 'Browse by genre or see what’s trending.', moviesIntro: 'Find a film for tonight.', seriesIntro: 'Find your next series to follow.', animeIntro: 'Discover anime films and series.',
      trendingMovies: 'Trending Movies', trendingSeries: 'Trending Series', tmdbWeekly: 'This week on TMDB · Available on 30nama', tmdbNoMatches: 'No titles from this week’s TMDB list are available on 30nama.', tmdbTrendError: 'Couldn’t load weekly trends from TMDB.', tmdbTrendSetup: 'TMDB isn’t configured on this TV.',
      trendingWeek: 'Trending this week', newSeries: 'New & returning series', popularMovies: 'Popular movies', trendingNow: 'Trending',
      crew: 'Crew', reviews: 'Reviews', moreLikeThis: 'More like this', nextEp: 'Next episode', newSeason: 'New season', nextSeason: 'Next season', close: 'Close', tmdb: 'TMDB metadata', tmdbOn: 'Connected', tmdbChecking: 'Checking…', tmdbRejected: 'Token rejected', tmdbUnavailable: 'Could not verify token', tmdbMock: 'Mock data', tmdbOff: 'Not configured', clearCache: 'Clear metadata cache', cleared: 'Cache cleared', tmdbCredit: 'Movie data from TMDB. Not endorsed or certified by TMDB.',
      Creator: 'Creator', Director: 'Director', Writer: 'Writer', Composer: 'Composer', 'Executive Producer': 'Executive producer', readMore: 'OK to read', scrollHint: '▲ ▼ scroll'
    },
    fa: {
      home: 'خانه', search: 'جستجو', archive: 'آرشیو', settings: 'تنظیمات', movies: 'فیلم', series: 'سریال', anime: 'انیمه', account: 'حساب',
      signIn: 'ورود', scanTitle: 'با گوشی اسکن کنید', step1: 'دوربین را باز کنید', step2: 'کد را اسکن کنید', step3: 'در ۳۰نما تأیید کنید',
      orVisit: 'یا به 30nama.com/auth بروید و وارد کنید', waiting: 'در انتظار اسکن…', expired: 'کد منقضی شد',
      guest: 'ادامه به عنوان مهمان', refresh: 'کد جدید', loading: 'در حال بارگذاری...', error: 'مشکلی پیش آمد', retry: 'تلاش دوباره',
      continueWatching: 'ادامه تماشا', dismissWatchHint: 'برای حذف، دکمهٔ تأیید را نگه دارید', dismissWatchTitle: 'از ادامه تماشا حذف شود؟', dismissWatch: 'حذف', dismissedWatch: 'از ادامه تماشا حذف شد', dismissWatchError: 'حذف عنوان انجام نشد. دوباره تلاش کنید.', hero_header: 'ویژه', new_releases: 'تازه‌ها', suggested: 'پیشنهادی',
      top_10: '۱۰ برتر', top10: '۱۰ برتر',
      play: 'پخش', resume: 'ادامه', details: 'جزئیات', episodes: 'قسمت‌ها', season: 'فصل', seasons: 'فصل', episode: 'قسمت', nowPlaying: 'در حال پخش', tryAgain: 'لطفاً کمی بعد دوباره تلاش کنید.', cast: 'بازیگران', featured: 'ویژه',
      movie: 'فیلم', persianSub: 'زیرنویس فارسی', minLeft: 'دقیقه مانده', min: 'دقیقه', free: 'رایگان', soon: 'به‌زودی',
      loginRequired: 'برای پخش و ادامه تماشا وارد شوید', playLogin: 'برای تماشا وارد شوید', noResults: 'نتیجه‌ای نیست', nothingFor: 'چیزی پیدا نشد برای',
      popularNow: 'محبوب این روزها', topResults: 'بهترین نتیجه‌ها', searchDelete: 'حذف آخرین نویسه', searchPh: 'جستجوی فیلم، سریال، انیمه', kbHint: 'با جهت‌نما تایپ کنید · چپ برای نتایج',
      space: 'فاصله', clearK: 'پاک', browse: 'مرور', categories: 'دسته‌ها', genres: 'ژانرها', newest: 'جدیدترین', year: 'سال', allYears: 'همه سال‌ها', noMatches: 'در این بخش عنوانی پیدا نشد.', noYearMatches: 'عنوانی برای این سال پیدا نشد.', findingYearMatches: 'در حال جستجوی عناوین این سال…', recentActivity: 'تازه‌ها و به‌روزرسانی‌ها', digitalRelease: 'تاریخ انتشار', olderReleases: 'انتشارهای قدیمی‌تر', noDigitalMatches: 'در این بخش عنوان قابل پخشی پیدا نشد.', recentlyAdded: 'تازه اضافه‌شده', popular: 'محبوب', updated: 'به‌روزشده', results: 'نتیجه',
      language: 'زبان', logout: 'خروج از حساب', login: 'ورود (QR)', guestAcc: 'مهمان', expires: 'پایان اشتراک', unknown: 'نامشخص', userType: 'نوع حساب',
      playback: 'پخش', display: 'نمایش', about: 'درباره', defSubs: 'زیرنویس پیش‌فرض', subSize: 'اندازه زیرنویس', autoplay: 'پخش خودکار قسمت بعد', reduce: 'کاهش حرکت',
      on: 'روشن', off: 'خاموش', small: 'کوچک', medium: 'متوسط', large: 'بزرگ', sample: 'زیرنویس به این شکل نمایش داده می‌شود.',
      version: 'نسخه', unofficial: 'نرم‌افزار غیررسمی ۳۰نما', apiHost: 'سرور API',
      skipIntro: 'رد کردن تیتراژ', skipRecap: 'رد کردن خلاصه', nextEpisode: 'قسمت بعد', playNow: 'پخش اکنون', credits: 'تیتراژ پایانی', restartPlayback: 'از ابتدا', titleStatus: 'وضعیت', network: 'شبکه', runtime: 'مدت', quality: 'کیفیت', audio: 'صدا', subtitles: 'زیرنویس',
      english: 'انگلیسی', persian: 'فارسی', noStream: 'پخش در دسترس نیست', loadMore: 'بیشتر',
      exitTitle: 'خروج از ۳۰نما؟', exitBody: 'هر زمان بخواهید می‌توانید برگردید.', exit: 'خروج', cancel: 'انصراف', logoutTitle: 'خروج از حساب؟', logoutBody: 'برای ورود دوباره باید کد جدیدی اسکن کنید.',
      hintPlayer: '▲ صدا و زیرنویس  ·  OK پخش/توقف', hintPlayerEps: '▲ صدا و زیرنویس  ·  OK پخش/توقف  ·  ▼ قسمت‌ها',
      welcome: 'خوش آمدید', subFailed: 'خطا در زیرنویس', playErr: 'خطای پخش',
      archiveIntro: 'داستان بعدی‌تان را پیدا کنید.', moviesIntro: 'برای امشب فیلمی پیدا کنید.', seriesIntro: 'سریال بعدی‌تان را پیدا کنید.', animeIntro: 'فیلم‌ها و سریال‌های انیمه را کشف کنید.',
      trendingMovies: 'فیلم‌های پرطرفدار', trendingSeries: 'سریال‌های پرطرفدار', tmdbWeekly: 'پرطرفدار این هفته در TMDB · قابل پخش در ۳۰نما', tmdbNoMatches: 'عنوان قابل پخشی از فهرست این هفتهٔ TMDB در ۳۰نما پیدا نشد.', tmdbTrendError: 'بارگیری فهرست هفتگی TMDB ممکن نبود.', tmdbTrendSetup: 'TMDB روی این تلویزیون تنظیم نشده است.',
      trendingWeek: 'پرطرفدار این هفته', newSeries: 'سریال‌های جدید و ادامه‌دار', popularMovies: 'فیلم‌های محبوب', trendingNow: 'پرطرفدار',
      crew: 'عوامل', reviews: 'نقد و نظر', moreLikeThis: 'مشابه این', nextEp: 'قسمت بعد', newSeason: 'فصل جدید', nextSeason: 'فصل بعد', close: 'بستن', tmdb: 'اطلاعات TMDB', tmdbOn: 'متصل', tmdbChecking: 'در حال بررسی…', tmdbRejected: 'توکن رد شد', tmdbUnavailable: 'بررسی توکن ممکن نبود', tmdbMock: 'داده آزمایشی', tmdbOff: 'تنظیم نشده', clearCache: 'پاک کردن حافظه نهان', cleared: 'پاک شد', tmdbCredit: 'اطلاعات فیلم‌ها از TMDB. مورد تأیید TMDB نیست.',
      Creator: 'سازنده', Director: 'کارگردان', Writer: 'نویسنده', Composer: 'آهنگساز', 'Executive Producer': 'تهیه‌کننده اجرایی', readMore: 'OK برای خواندن', scrollHint: '▲ ▼ پیمایش'
    }
  };
  Object.assign(S.en, {filmography:'Filmography',allCredits:'All',findingCredit:'Looking up the title…',creditUnavailable:'This title could not be found in 30nama.',noPersonCredits:'No movie or series credits found.',personNotFound:'Could not identify this person in TMDB.',tmdbTokenLabel:'TMDB read access token',tmdbSaveToken:'Save token',tmdbRemoveToken:'Remove TMDB token',ageRating:'Age',pause:'Pause',listFull:'My List is full. Remove a title before adding another.',listSaveError:'Couldn’t save My List on this device.',myList:'My List',saveTitle:'Add to My List',removeTitle:'Remove from My List',savedTitle:'Added to My List',removedTitle:'Removed from My List',emptyList:'Your list starts here',listHint:'Save a title from its details page to find it here.',listIntro:'The stories you want to watch next.',recovering:'Reconnecting…',tryingQuality:'Trying another quality…',playbackStopped:'Playback couldn’t continue',playbackHelp:'Retry from your saved position or choose another quality.',offlineHelp:'You appear to be offline. Reconnect, then try again.',otherQuality:'Other qualities',backToDetails:'Back to details',volume:'Volume',mute:'Mute',unmute:'Unmute',fullscreen:'Full screen'});
  Object.assign(S.fa, {filmography:'آثار',allCredits:'همه',findingCredit:'در حال جستجوی عنوان…',creditUnavailable:'این عنوان در ۳۰نما پیدا نشد.',noPersonCredits:'فیلم یا سریالی پیدا نشد.',personNotFound:'این شخص در TMDB پیدا نشد.',tmdbTokenLabel:'توکن دسترسی TMDB',tmdbSaveToken:'ذخیره توکن',tmdbRemoveToken:'حذف توکن TMDB',ageRating:'سن',pause:'مکث',listFull:'فهرست من پر شده است. ابتدا عنوانی را حذف کنید.',listSaveError:'ذخیره فهرست من در این دستگاه انجام نشد.',myList:'فهرست من',saveTitle:'افزودن به فهرست من',removeTitle:'حذف از فهرست من',savedTitle:'به فهرست من اضافه شد',removedTitle:'از فهرست من حذف شد',emptyList:'فهرست شما از اینجا شروع می‌شود',listHint:'عنوانی را از صفحه جزئیات ذخیره کنید تا اینجا نمایش داده شود.',listIntro:'داستان‌هایی که می‌خواهید تماشا کنید.',recovering:'در حال اتصال دوباره…',tryingQuality:'در حال امتحان کیفیت دیگر…',playbackStopped:'پخش متوقف شد',playbackHelp:'از موقعیت قبلی دوباره امتحان کنید یا کیفیت دیگری را انتخاب کنید.',offlineHelp:'به نظر می‌رسد آفلاین هستید. پس از اتصال دوباره امتحان کنید.',otherQuality:'کیفیت‌های دیگر',backToDetails:'بازگشت به جزئیات',volume:'صدا',mute:'بی‌صدا',unmute:'فعال کردن صدا',fullscreen:'تمام‌صفحه'});
  N.lang = N.store.get('lang', 'en');
  N.t = function (k) { var d = S[N.lang] || S.en; return d[k] !== undefined ? d[k] : (S.en[k] !== undefined ? S.en[k] : k); };
  N.setLang = function (l) {
    N.lang = l; N.store.set('lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    document.dispatchEvent(new CustomEvent('nama:language'));
  };
  N.isRtl = function () { return N.lang === 'fa'; };
  document.documentElement.lang = N.lang;
  document.documentElement.dir = N.lang === 'fa' ? 'rtl' : 'ltr';
})();
