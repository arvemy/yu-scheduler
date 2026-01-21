import { derived, writable } from 'svelte/store';
import { dev } from '$app/environment';
import { STORAGE_KEYS } from '$lib/storage/keys';

type Locale = 'en' | 'tr';

export type Translator = (key: string, params?: Record<string, string | number>) => string;

const messages = {
	en: {
		app: {
			title: 'YU Scheduler',
			subtitle: 'Course Planner'
		},
		nav: {
			github: 'GitHub',
			linkedin: 'LinkedIn',
			portfolio: 'Portfolio',
			more: 'More',
			showWelcome: 'About'
		},
		tooltips: {
			portfolio: 'Visit Portfolio',
			github: 'View on GitHub',
			linkedin: 'Connect on LinkedIn',
			about: 'About this app',
			switchLanguage: 'Switch language',
			blockUnblockDay: 'Click to block/unblock entire day',
			clearAll: 'Clear all selections and blocked hours'
		},
		courseSelector: {
			search: 'Search and select courses',
			typeToSearch: 'Type to search courses',
			noResults: 'No courses found',
			selectedCourses: 'Selected Courses',
			courseGroups: 'Course Groups',
			generateSchedule: 'Generate Schedule',
			generateNewSchedule: 'Generate New Schedule',
			generatingSchedule: 'Generating Schedule...',
			download: 'Download',
			schedulesFound: '{{count}} Valid Schedule Found',
			schedulesFound_one: '1 Valid Schedule Found',
			schedulesFound_other: '{{count}} Valid Schedules Found',
			schedule: 'Schedule',
			noSchedulesTitle: 'No Valid Schedule Found',
			noSchedulesDesc: 'Try selecting different courses or removing some blocked hours.',
			failedToLoad: 'Failed to load courses. Please try again later.',
			failedToLoadTerms: 'Unable to load terms. Please refresh the page.',
			reload: 'Reload',
			pleaseSelectCourse: 'Please select at least one course',
			any: 'X',
			sectionSelectAriaLabel: 'Select section for {{course}}',
			removeCourse: 'Remove course {{course}}',
			showCourses: 'Show courses in group {{group}}',
			blockUnblockCell: 'Block/unblock {{day}} at {{slot}}',
			blockUnblockHour: 'Block/unblock this hour for all days',
			downloadImage: 'Download schedule as image',
			downloadingImage: 'Preparing image…',
			generateShort: 'Generate',
			generatingShort: 'Generating…',
			warnings: 'warnings',
			showWarnings: 'Show warnings',
			hideWarnings: 'Hide warnings',
			showSelectedCourses: 'Show selected courses',
			hideSelectedCourses: 'Hide selected courses',
			blockDay: 'Block all',
			unblockDay: 'Unblock all',
			clearAll: 'Clear All',
			retry: 'Retry',
			sectionsPartialWarning: 'Some section details failed to load. You can still generate schedules, or retry loading sections.',
			generateScheduleFirst: 'Generate a schedule first to save',
			blockedAdded: '{{count}} block added ({{target}})',
			blockedAdded_one: '1 block added ({{target}})',
			blockedAdded_other: '{{count}} blocks added ({{target}})',
			blocksCleared: '{{count}} block removed ({{target}})',
			blocksCleared_one: '1 block removed ({{target}})',
			blocksCleared_other: '{{count}} blocks removed ({{target}})',
			blockingTip: {
				title: 'Block Time Slots',
				description: "Click on time slots to block them from your schedule. This prevents courses from being scheduled at those times.",
				desktop: '• Click day headers to block entire days\n• Click time headers to block time across all days\n• Click individual cells to block specific time slots',
				mobile: '• Tap day headers to block entire days\n• Tap time slots to block specific time slots',
				gotIt: 'Got it!'
			},
			actions: 'Schedule actions',
			connector: {
				and: 'AND',
				or: 'OR'
			}
		},
		pagination: {
			previous: 'Previous',
			next: 'Next',
			goTo: 'Go to schedule',
			of: 'of'
		},
		timetable: {
			days: {
				Monday: 'Monday',
				Tuesday: 'Tuesday',
				Wednesday: 'Wednesday',
				Thursday: 'Thursday',
				Friday: 'Friday',
				Saturday: 'Saturday',
				Sunday: 'Sunday'
			},
			time: 'Time',
			multipleSections: 'Multiple sections at this time',
			sectionOptions: 'section options',
			clickToBlock: 'Click on cells, rows, or columns to block time slots'
		},
			errors: {
			failedToLoadCourses: 'Failed to load courses: {{error}}',
			failedToLoadSections: 'Failed to load course sections: {{error}}',
			failedToGenerateSchedule: 'Failed to generate schedule: {{error}}',
			failedToDownload: 'Failed to download schedule. Please try again.',
			networkError: 'Network error occurred',
			unexpectedError: 'An unexpected error occurred',
			timeConflicts: 'Conflicts between selected courses.',
			timeConflictBetweenCourses: 'Conflict between {{course1}} and {{course2}}.',
			timeConflictWithBlockedHours: '{{course}} conflicts with your blocked time slot.',
			timeConflictWithSpecificBlockedHours:
				'{{course}} conflicts with your blocked time slot at {{blockedHours}}.',
			noValidScheduleConflicts: 'Course time conflicts prevent a valid schedule.',
			noValidScheduleBlockedHours: 'Blocked time slots prevent a valid schedule.',
			noValidScheduleGeneral: 'No schedule fits your current selections.',
			noValidScheduleIncludingCourse: 'No valid schedule including {{course}} found.',
			allCoursesExcluded: 'All selected courses were excluded due to conflicts.',
			serverError: 'Server is temporarily unavailable. Please try again later.',
			serviceUnavailable: 'Service is temporarily down for maintenance.',
			requestTimeout: 'Request took too long to complete. Please try again.',
			courseNoSessionData: '{{course}} course has no session data available for this term',
			courseNotAvailable: '{{course}} course is not available for this term',
			termNotFound: 'Course data for the requested term was not found',
			noCourseData: 'No course data is available',
			notFound: 'Requested resource was not found',
			unauthorized: 'Access is not authorized',
			forbidden: 'Access is forbidden',
			failedToLoadTerms: 'Unable to load terms. Please refresh the page.',
			close: 'close',
			contactSupport: 'If this persists, please contact support.',
			scheduleNotFound: 'Schedule not found',
			storageQuotaExceeded: 'Storage quota exceeded',
			storageNotAvailable: 'Storage not available',
			unknownStorageError: 'Unknown storage error',
			failedToRenameSchedule: 'Failed to rename schedule.',
			unknownError: 'Unknown error'
		},
		language: {
			english: 'English',
			turkish: 'Türkçe',
			switchLanguage: 'Switch language'
		},
		terms: {
			fall: 'Fall',
			spring: 'Spring',
			summer: 'Summer'
		},
		locale: {
			code: 'en'
		},
		savedSchedules: {
			saveSchedule: 'Save Schedule',
			savedSchedules: 'Saved Schedules',
			scheduleName: 'Schedule Name',
			scheduleDetails: 'Schedule Details',
			term: 'Term',
			courses: 'Courses',
			coursesSelected: 'selected',
			schedules: 'schedules',
			schedulesGenerated: 'generated',
			currentSchedule: 'Current schedule',
			of: 'of',
			activeSchedulePreview: 'Active Schedule Preview',
			save: 'Save',
			saving: 'Saving...',
			cancel: 'Cancel',
			close: 'Close',
			nameRequired: 'Schedule name is required',
			saveFailed: 'Failed to save schedule',
			storageError: 'Storage Error',
			loadFailed: 'Failed to load saved schedules',
			deleteFailed: 'Failed to delete schedule',
			renameFailed: 'Failed to rename schedule',
			clearFailed: 'Failed to clear schedules',
			noSavedSchedules: 'No Saved Schedules',
			noSavedSchedulesDesc: 'Save your favorite schedules to quickly access them later.',
			showingCurrentTerm: 'Showing {{count}} schedule for {{term}}. {{hidden}} from other terms are hidden.',
			showingCurrentTerm_one: 'Showing 1 schedule for {{term}}. {{hidden}} from other terms are hidden.',
			showingCurrentTerm_other: 'Showing {{count}} schedules for {{term}}. {{hidden}} from other terms are hidden.',
			savedOn: 'Saved on',
			loadSchedule: 'Load Schedule',
			renameSchedule: 'Rename Schedule',
			deleteSchedule: 'Delete Schedule',
			storageUsage: 'Storage Usage',
			clearAll: 'Clear All',
			clearAllConfirm: 'Are you sure you want to delete all saved schedules? This action cannot be undone.',
			schedule: 'Schedule',
			scheduleWasSaved: 'Schedule "{{name}}" has been saved successfully!',
			scheduleWasLoaded: 'Schedule "{{name}}" has been loaded successfully!'
		},
		welcome: {
			title: 'Welcome to YU Scheduler!',
			description: 'YU Scheduler is your comprehensive course planning tool for Yaşar University. Easily create and manage your class schedules with our intuitive interface.',
			features: "Here's what you can do:",
			feature1: 'Search and select courses from all available options',
			feature2: 'Generate optimized schedules automatically',
			feature3: "Block specific time slots that don't work for you",
			feature4: 'Save and manage multiple schedule options',
			updates: {
				title: 'Latest Updates',
				term: '2025–2026 Fall',
				items: {
					fallTermAdded: 'Fall term courses have been added to the system'
				},
				addedOn: 'Added on: Saturday, Sep 22'
			},
			importantNotice: 'Please verify your course schedule from https://oim.yasar.edu.tr/ders-kayitlari',
			disclaimer: 'This tool is designed to help students plan their schedules more effectively and is not affiliated with Yaşar University.',
			privacyNote: 'All data is stored and processed locally in your browser; nothing is transmitted to external servers.',
			dontShowAgain: "Don't show this again",
			getStarted: 'Get Started'
		},
		common: {
			cancel: 'Cancel',
			close: 'Close',
			save: 'Save',
			delete: 'Delete',
			edit: 'Edit',
			load: 'Load',
			share: 'Share',
			expand: 'Expand',
			collapse: 'Collapse'
		}
	},
	tr: {
		app: {
			title: 'YU Scheduler',
			subtitle: 'Ders Planlayıcı'
		},
		nav: {
			github: 'GitHub',
			linkedin: 'LinkedIn',
			portfolio: 'Portföy',
			more: 'Daha Fazla',
			showWelcome: 'Hakkında'
		},
		tooltips: {
			portfolio: 'Portföyü Ziyaret Et',
			github: "GitHub'da Görüntüle",
			linkedin: "LinkedIn'de Bağlan",
			about: 'Uygulama Hakkında',
			switchLanguage: 'Dili Değiştir',
			blockUnblockDay: 'Tüm günü engellemek veya engeli kaldırmak için tıklayın',
			clearAll: 'Tüm seçimleri ve engellenmiş saatleri temizle'
		},
		courseSelector: {
			search: 'Ders Ara ve Seç',
			typeToSearch: 'Ders aramak için yazın',
			noResults: 'Sonuç bulunamadı',
			selectedCourses: 'Seçilen Dersler',
			courseGroups: 'Ders Grupları',
			generateSchedule: 'Program Oluştur',
			generateNewSchedule: 'Yeni Program Oluştur',
			generatingSchedule: 'Program Oluşturuluyor...',
			download: 'İndir',
			schedulesFound: '{{count}} Geçerli Program Bulundu',
			schedulesFound_one: '1 Geçerli Program Bulundu',
			schedulesFound_other: '{{count}} Geçerli Program Bulundu',
			schedule: 'Program',
			noSchedulesTitle: 'Geçerli Program Bulunamadı',
			noSchedulesDesc: 'Farklı dersler seçmeyi veya bazı engellenmiş saatleri kaldırmayı deneyin.',
			failedToLoad: 'Dersler yüklenemedi. Lütfen daha sonra tekrar deneyin.',
			failedToLoadTerms: 'Dönemler yüklenemedi. Lütfen sayfayı yenileyin.',
			reload: 'Yeniden Yükle',
			pleaseSelectCourse: 'Lütfen en az bir ders seçin',
			any: 'X',
			sectionSelectAriaLabel: '{{course}} dersi için şube seç',
			removeCourse: '{{course}} dersini kaldır',
			showCourses: '{{group}} grubundaki dersleri göster',
			blockUnblockCell: '{{day}} günü {{slot}} saatini engelle veya engeli kaldır',
			blockUnblockHour: 'Bu saati tüm günler için engelle veya engeli kaldır',
			downloadImage: 'Programı resim olarak indir',
			downloadingImage: 'Resim hazırlanıyor…',
			generateShort: 'Oluştur',
			generatingShort: 'Oluşturuluyor…',
			warnings: 'uyarı',
			showWarnings: 'Uyarıları Göster',
			hideWarnings: 'Uyarıları Gizle',
			showSelectedCourses: 'Seçilen Dersleri Göster',
			hideSelectedCourses: 'Seçilen Dersleri Gizle',
			blockDay: 'Tümünü Engelle',
			unblockDay: 'Engeli Kaldır',
			clearAll: 'Tümünü Temizle',
			retry: 'Tekrar Dene',
			sectionsPartialWarning: 'Bazı şube detayları yüklenemedi. Yine de program oluşturabilir veya şubeleri yeniden yüklemeyi deneyebilirsiniz.',
			generateScheduleFirst: 'Kaydetmek için önce bir program oluşturun',
			blockedAdded: '{{count}} engel eklendi ({{target}})',
			blockedAdded_one: '1 engel eklendi ({{target}})',
			blockedAdded_other: '{{count}} engel eklendi ({{target}})',
			blocksCleared: '{{count}} engel kaldırıldı ({{target}})',
			blocksCleared_one: '1 engel kaldırıldı ({{target}})',
			blocksCleared_other: '{{count}} engel kaldırıldı ({{target}})',
			blockingTip: {
				title: 'Zaman Dilimlerini Engelle',
				description: 'Programınızdan kaldırmak istediğiniz zaman dilimlerine tıklayın. Bu sayede dersler o saatlerde planlanmaz.',
				desktop: '• Tüm günü engellemek için gün başlıklarına tıklayın\n• Zamanı tüm günlerde engellemek için saat başlıklarına tıklayın\n• Belirli zaman dilimlerini engellemek için hücrelere tıklayın',
				mobile: '• Tüm günü engellemek için gün başlıklarına dokunun\n• Belirli zaman dilimlerini engellemek için hücrelere dokunun',
				gotIt: 'Anladım!'
			},
			actions: 'Program işlemleri',
			connector: {
				and: 'VE',
				or: 'VEYA'
			}
		},
		pagination: {
			previous: 'Önceki',
			next: 'Sonraki',
			goTo: 'Programa Git',
			of: ' / '
		},
		timetable: {
			days: {
				Monday: 'Pazartesi',
				Tuesday: 'Salı',
				Wednesday: 'Çarşamba',
				Thursday: 'Perşembe',
				Friday: 'Cuma',
				Saturday: 'Cumartesi',
				Sunday: 'Pazar'
			},
			time: 'Saat',
			multipleSections: 'Bu saatte birden fazla şube var',
			sectionOptions: 'şube seçeneği',
			clickToBlock: 'Zaman dilimlerini engellemek için hücrelere, satırlara veya sütunlara tıklayın'
		},
			errors: {
			failedToLoadCourses: 'Dersler yüklenemedi: {{error}}',
			failedToLoadSections: 'Ders şubeleri yüklenemedi: {{error}}',
			failedToGenerateSchedule: 'Program oluşturulamadı: {{error}}',
			failedToDownload: 'Program indirilemedi. Lütfen tekrar deneyin.',
			networkError: 'Ağ hatası oluştu',
			unexpectedError: 'Beklenmeyen bir hata oluştu',
			timeConflicts: 'Seçilen dersler arasında zaman çakışması var',
			timeConflictBetweenCourses: '{{course1}} ve {{course2}} arasında çakışma var.',
			timeConflictWithBlockedHours: '{{course}} dersi engellenmiş saatlerinizle çakışıyor.',
			timeConflictWithSpecificBlockedHours:
				'{{course}} dersi engellenmiş zaman diliminizle çakışıyor ({{blockedHours}}).',
			noValidScheduleConflicts: 'Ders çakışmaları geçerli bir programı engelliyor.',
			noValidScheduleBlockedHours: 'Engellenmiş saatler geçerli bir programı engelliyor.',
			noValidScheduleGeneral: 'Mevcut seçimlerinizle uyumlu bir program bulunamadı.',
			noValidScheduleIncludingCourse: '{{course}} içeren geçerli program bulunamadı.',
			allCoursesExcluded: 'Seçilen tüm dersler çakışmalar nedeniyle elendi.',
			serverError: 'Sunucu şu an kullanılamıyor. Daha sonra deneyin.',
			serviceUnavailable: 'Hizmet bakım nedeniyle geçici olarak kapalı.',
			requestTimeout: 'İstek süresi aşıldı. Tekrar deneyin.',
			courseNoSessionData: '{{course}} dersi için bu dönemde veri yok',
			courseNotAvailable: '{{course}} dersi bu dönemde mevcut değil',
			termNotFound: 'İstenen dönem için ders verisi bulunamadı',
			noCourseData: 'Ders verisi yok',
			notFound: 'İstenen kaynak bulunamadı',
			unauthorized: 'Yetkisiz erişim',
			forbidden: 'Erişim yasak',
			failedToLoadTerms: 'Dönemler yüklenemedi. Sayfayı yenileyin.',
			close: 'kapat',
			contactSupport: 'Sorun devam ederse destek ekibiyle iletişime geçin.',
			scheduleNotFound: 'Program bulunamadı',
			storageQuotaExceeded: 'Depolama kotası aşıldı',
			storageNotAvailable: 'Depolama kullanılamıyor',
			unknownStorageError: 'Bilinmeyen depolama hatası',
			failedToRenameSchedule: 'Program adı değiştirilemedi.',
			unknownError: 'Bilinmeyen hata'
		},
		language: {
			english: 'English',
			turkish: 'Türkçe',
			switchLanguage: 'Dil Değiştir'
		},
		terms: {
			fall: 'Güz',
			spring: 'Bahar',
			summer: 'Yaz'
		},
		locale: {
			code: 'tr'
		},
		savedSchedules: {
			saveSchedule: 'Programı Kaydet',
			savedSchedules: 'Kayıtlı Programlar',
			scheduleName: 'Program Adı',
			scheduleDetails: 'Program Detayları',
			term: 'Dönem',
			courses: 'Ders',
			coursesSelected: 'seçildi',
			schedules: 'program',
			schedulesGenerated: 'oluşturuldu',
			currentSchedule: 'Mevcut Program',
			of: ' / ',
			activeSchedulePreview: 'Aktif Program Önizlemesi',
			save: 'Kaydet',
			saving: 'Kaydediliyor...',
			cancel: 'İptal',
			close: 'Kapat',
			nameRequired: 'Program adı zorunlu',
			saveFailed: 'Program kaydedilemedi',
			storageError: 'Depolama Hatası',
			loadFailed: 'Kayıtlı programlar yüklenemedi',
			deleteFailed: 'Program silinemedi',
			renameFailed: 'Program adı değiştirilemedi',
			clearFailed: 'Programlar temizlenemedi',
			noSavedSchedules: 'Kayıtlı Program Yok',
			noSavedSchedulesDesc: 'Favori programlarınızı kaydederek daha sonra hızlıca erişebilirsiniz.',
			showingCurrentTerm: '{{term}} dönemi için {{count}} program gösteriliyor. Diğer dönemlerden {{hidden}} program gizli.',
			showingCurrentTerm_one: '{{term}} dönemi için 1 program gösteriliyor. Diğer dönemlerden {{hidden}} program gizli.',
			showingCurrentTerm_other: '{{term}} dönemi için {{count}} program gösteriliyor. Diğer dönemlerden {{hidden}} program gizli.',
			savedOn: 'Kaydedilme Tarihi',
			loadSchedule: 'Programı Yükle',
			renameSchedule: 'Programı Yeniden Adlandır',
			deleteSchedule: 'Programı Sil',
			storageUsage: 'Depolama Kullanımı',
			clearAll: 'Tümünü Temizle',
			clearAllConfirm: 'Tüm kayıtlı programları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
			schedule: 'Program',
			scheduleWasSaved: '"{{name}}" programı başarıyla kaydedildi!',
			scheduleWasLoaded: '"{{name}}" programı başarıyla yüklendi!'
		},
		welcome: {
			title: "YU Scheduler'a Hoş Geldiniz!",
			description: 'YU Scheduler, Yaşar Üniversitesi öğrencileri için kapsamlı bir ders planlama aracıdır. Kolay kullanımlı arayüzüyle ders programlarınızı oluşturun ve yönetin.',
			features: 'Yapabilecekleriniz:',
			feature1: 'Tüm mevcut dersleri arayın ve seçin',
			feature2: 'Otomatik olarak optimize edilmiş programlar oluşturun',
			feature3: 'Uygun olmayan zaman dilimlerini engelleyin',
			feature4: 'Birden fazla programı kaydedin ve yönetin',
			updates: {
				title: 'Son Güncellemeler',
				term: '2025–2026 Güz',
				items: {
					fallTermAdded: 'Güz dönemi dersleri sisteme eklenmiştir'
				},
				addedOn: 'Eklendi: 22 Eylül Pazar'
			},
			importantNotice: 'Lütfen ders programınızı https://oim.yasar.edu.tr/ders-kayitlari sitesinden doğrulayın.',
			disclaimer: 'Bu araç, öğrencilerin ders programlarını daha hızlı bir şekilde oluşturmalarına yardımcı olmak için tasarlanmıştır ve Yaşar Üniversitesi ile bağlantılı değildir.',
			privacyNote: 'Tüm veriler tarayıcınızda yerel olarak saklanır ve işlenir; harici sunuculara hiçbir şey gönderilmez.',
			dontShowAgain: 'Bir Daha Gösterme',
			getStarted: 'Başlayın'
		},
		common: {
			cancel: 'İptal',
			close: 'Kapat',
			save: 'Kaydet',
			delete: 'Sil',
			edit: 'Düzenle',
			load: 'Yükle',
			share: 'Paylaş',
			expand: 'Genişlet',
			collapse: 'Daralt'
		}
	}
} as const;

type Messages = (typeof messages)[Locale];

const getNestedValue = (source: Messages, path: string): string | undefined => {
	const parts = path.split('.');
	let value: unknown = source;
	for (const part of parts) {
		if (!value || typeof value !== 'object') return undefined;
		value = (value as Record<string, unknown>)[part];
	}
	return typeof value === 'string' ? value : undefined;
};

const applyParams = (template: string, params?: Record<string, string | number>): string => {
	if (!params) return template;
	return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		const value = params[key];
		return value === undefined ? match : String(value);
	});
};

const detectLocale = (): Locale => {
	try {
		const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);
		if (stored === 'en' || stored === 'tr') return stored;
	} catch (err) {
		if (dev) console.warn('[DEV] Failed to read locale from localStorage', err);
	}
	if (typeof document !== 'undefined') {
		const lang = document.documentElement.lang;
		if (lang?.startsWith('tr')) return 'tr';
	}
	if (typeof navigator !== 'undefined') {
		const lang = navigator.language || '';
		if (lang.startsWith('tr')) return 'tr';
	}
	return 'en';
};

const locale = writable<Locale>(detectLocale());

const t = derived(locale, ($locale) => {
	return (key: string, params?: Record<string, string | number>) => {
		const count = params?.count;
		let template: string | undefined;
		if (typeof count === 'number') {
			const pluralKey = `${key}_${count === 1 ? 'one' : 'other'}`;
			template = getNestedValue(messages[$locale], pluralKey) ?? getNestedValue(messages.en, pluralKey);
		}
		if (!template) {
			template = getNestedValue(messages[$locale], key) ?? getNestedValue(messages.en, key);
		}
		return applyParams(template ?? key, params);
	};
});

const setLocale = (next: Locale) => {
	locale.set(next);
	try {
		localStorage.setItem(STORAGE_KEYS.LOCALE, next);
	} catch (err) {
		if (dev) console.warn('[DEV] Failed to save locale to localStorage', err);
	}
	if (typeof document !== 'undefined') {
		document.documentElement.lang = next;
	}
};

export { locale, t, setLocale, messages };
