import type { Messages } from './en';

/**
 * Turkish message catalogue.
 *
 * `satisfies Messages` makes the type-check fail if this catalogue drifts from
 * the English source of truth (missing or extra keys), keeping locales in sync.
 */
export const tr = {
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
		reorderCourse: '{{course}} dersini taşımak için sürükleyin',
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
		sectionsPartialWarning:
			'Bazı şube detayları yüklenemedi. Yine de program oluşturabilir veya şubeleri yeniden yüklemeyi deneyebilirsiniz.',
		generateScheduleFirst: 'Kaydetmek için önce bir program oluşturun',
		blockedAdded: '{{count}} engel eklendi ({{target}})',
		blockedAdded_one: '1 engel eklendi ({{target}})',
		blockedAdded_other: '{{count}} engel eklendi ({{target}})',
		blocksCleared: '{{count}} engel kaldırıldı ({{target}})',
		blocksCleared_one: '1 engel kaldırıldı ({{target}})',
		blocksCleared_other: '{{count}} engel kaldırıldı ({{target}})',
		blockingTip: {
			title: 'Zaman Dilimlerini Engelle',
			description:
				'Programınızdan kaldırmak istediğiniz zaman dilimlerine tıklayın. Bu sayede dersler o saatlerde planlanmaz.',
			desktop:
				'• Tüm günü engellemek için gün başlıklarına tıklayın\n• Zamanı tüm günlerde engellemek için saat başlıklarına tıklayın\n• Belirli zaman dilimlerini engellemek için hücrelere tıklayın',
			mobile:
				'• Tüm günü engellemek için gün başlıklarına dokunun\n• Belirli zaman dilimlerini engellemek için hücrelere dokunun',
			gotIt: 'Anladım!'
		},
		actions: 'Program işlemleri',
		totalAkts: '{{count}} AKTS',
		totalAktsPartial: '{{count}}+ AKTS',
		totalAktsPartialTooltip:
			'Seçili bazı derslerin AKTS bilgisi yok, bu yüzden gerçek toplam daha yüksek olabilir.',
		totalAktsAlternativesTooltip: 'Toplam, programa hangi VEYA alternatifinin girdiğine bağlıdır.',
		aktsOr: 'veya',
		aktsLabel: 'AKTS',
		viewOnObs: "OBS'de görüntüle",
		connector: {
			and: 'VE',
			or: 'VEYA'
		}
	},
	program: {
		label: 'Program',
		all: 'Tüm programlar',
		ariaLabel: 'Bölümünüzü seçin'
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
		timeConflictWithBlockedHours: '{{course}} engellediğiniz saatlere denk geliyor.',
		timeConflictWithSpecificBlockedHours:
			'{{course}} engellediğiniz saatlere denk geliyor ({{blockedHours}}).',
		noValidScheduleConflicts: 'Ders çakışmaları geçerli bir programı engelliyor.',
		noValidScheduleBlockedHours: 'Engellenmiş saatler geçerli bir programı engelliyor.',
		noValidScheduleGeneral: 'Mevcut seçimlerinizle uyumlu bir program bulunamadı.',
		noValidScheduleIncludingCourse:
			'{{course}} eklenemiyor — diğer seçtiğiniz derslerle çakışıyor.',
		optionNotSchedulable: '{{course}} eklenemiyor — seçilen şube artık mevcut değil.',
		allCoursesExcluded: 'Seçtiğiniz derslerin hiçbiri programa eklenemedi.',
		allCoursesNoData: 'Seçtiğiniz derslerin hiçbiri için bu dönemde ders verisi yok.',
		allCoursesBlocked: 'Seçtiğiniz tüm dersler engellediğiniz saatlere denk geliyor.',
		serverError: 'Sunucu şu an kullanılamıyor. Daha sonra deneyin.',
		serviceUnavailable: 'Hizmet bakım nedeniyle geçici olarak kapalı.',
		requestTimeout: 'İstek süresi aşıldı. Tekrar deneyin.',
		courseNoSessionData: '{{course}} için bu dönemde ders verisi yok.',
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
		showingCurrentTerm:
			'{{term}} dönemi için {{count}} program gösteriliyor. Diğer dönemlerden {{hidden}} program gizli.',
		showingCurrentTerm_one:
			'{{term}} dönemi için 1 program gösteriliyor. Diğer dönemlerden {{hidden}} program gizli.',
		showingCurrentTerm_other:
			'{{term}} dönemi için {{count}} program gösteriliyor. Diğer dönemlerden {{hidden}} program gizli.',
		savedOn: 'Kaydedilme Tarihi',
		loadSchedule: 'Programı Yükle',
		renameSchedule: 'Programı Yeniden Adlandır',
		deleteSchedule: 'Programı Sil',
		storageUsage: 'Depolama Kullanımı',
		clearAll: 'Tümünü Temizle',
		clearAllConfirm:
			'Tüm kayıtlı programları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
		schedule: 'Program',
		scheduleWasSaved: '"{{name}}" programı başarıyla kaydedildi!',
		scheduleWasLoaded: '"{{name}}" programı başarıyla yüklendi!'
	},
	welcome: {
		title: "YU Scheduler'a Hoş Geldiniz!",
		description:
			'YU Scheduler, Yaşar Üniversitesi öğrencileri için kapsamlı bir ders planlama aracıdır. Kolay kullanımlı arayüzüyle ders programlarınızı oluşturun ve yönetin.',
		features: 'Yapabilecekleriniz:',
		feature1: 'Tüm mevcut dersleri arayın ve seçin',
		feature2: 'Otomatik olarak optimize edilmiş programlar oluşturun',
		feature3: 'Uygun olmayan zaman dilimlerini engelleyin',
		feature4: 'Birden fazla programı kaydedin ve yönetin',
		updates: {
			title: 'Son Güncellemeler',
			term: '2025–2026 Yaz',
			items: {
				termCoursesAdded: 'Yaz dönemi dersleri sisteme eklenmiştir'
			},
			addedOn: 'Eklendi: 4 Haziran Perşembe'
		},
		importantNotice:
			'En doğru bilgi için lütfen ders programınızı <a href="https://oim.yasar.edu.tr/ders-kayitlari" target="_blank" rel="noopener noreferrer">oim.yasar.edu.tr/ders-kayitlari</a> adresinden kontrol ediniz.',
		disclaimer:
			'Bu araç, öğrencilerin ders programlarını daha hızlı bir şekilde oluşturmalarına yardımcı olmak için tasarlanmıştır ve Yaşar Üniversitesi ile bağlantılı değildir.',
		privacyNote:
			'Tüm veriler tarayıcınızda yerel olarak saklanır ve işlenir; harici sunuculara hiçbir şey gönderilmez.',
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
} satisfies Messages;
