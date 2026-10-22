// Iconografia do design system InnLex: Font Awesome 6 Solid em tudo.
// Os nomes exportados são os que as telas já usavam (herança do lucide), para
// a troca ser só o caminho do import. Cada glifo é sólido, herda currentColor
// e é dimensionado pela classe (h-4 w-4…) ou pela prop `size`.
import {
  faWaveSquare, faCircleExclamation, faTriangleExclamation, faArrowLeft, faArrowRight,
  faArrowUpRightFromSquare, faArrowTrendUp, faArrowTrendDown, faCircleCheck, faPercent,
  faMoneyBillWave, faChartColumn, faBath, faBed, faBell, faBriefcase, faBuilding,
  faCalculator, faCalendar, faCalendarCheck, faCalendarDays, faCalendarWeek, faCar,
  faCheck, faChevronDown, faChevronLeft, faChevronRight, faChevronUp, faCircleDot,
  faClipboardList, faClock, faCoins, faAddressBook, faCopy, faCreditCard, faCrown,
  faDollarSign, faDownload, faEye, faEyeSlash, faFileLines, faFileCircleCheck,
  faFileCircleQuestion, faMagnifyingGlass, faFileSignature, faFileCircleXmark, faFilter,
  faFingerprint, faFolderOpen, faGaugeHigh, faGavel, faGift, faGlobe, faGripVertical,
  faHammer, faHandHoldingDollar, faHandshake, faHeart, faHouse, faIdCard, faImage,
  faImages, faInbox, faCircleInfo, faKey, faLandmark, faLayerGroup, faTableCells,
  faLightbulb, faSpinner, faLock, faRightFromBracket, faEnvelope, faLocationDot,
  faMapLocationDot, faExpand, faBullhorn, faBars, faComment, faMessage, faEllipsisVertical,
  faCircleXmark, faTableColumns, faPaperclip, faPen, faPhone, faPlus, faPrint, faQrcode,
  faTowerBroadcast, faReceipt, faRotate, faRotateLeft, faTableList, faFloppyDisk,
  faScaleBalanced, faPaperPlane, faGear, faGears, faShieldHalved, faSignsPost, faSliders,
  faWandMagicSparkles, faStar, faNoteSticky, faStore, faTable, faTag, faBullseye, faTrash,
  faTrophy, faUpload, faUser, faUserCheck, faUserGear, faUserTie, faUsers, faWallet,
  faDiagramProject, faWrench, faXmark, faBolt, faChartLine, faFileInvoiceDollar,
  faUserLarge, faSquareCheck, faCircleHalfStroke, faRightToBracket, faPause, faPlay, faFolderOpen as faFolderOpen2,
} from "@fortawesome/free-solid-svg-icons";

function make(def, name) {
  const [w, h, , , path] = def.icon;
  const paths = Array.isArray(path) ? path : [path];
  function Icon({ size, className = "", strokeWidth, absoluteStrokeWidth, color, style, title, ...rest }) {
    const dims = size != null ? { width: size, height: size } : { width: "1em", height: "1em" };
    const sized = /(^|\s)(size-|h-|w-)/.test(className);
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${w} ${h}`}
        fill="currentColor"
        aria-hidden={title ? undefined : true}
        role={title ? "img" : undefined}
        focusable="false"
        data-icon={name}
        className={`ix-icon shrink-0 ${className}`}
        style={{ color, ...style }}
        {...(sized ? {} : dims)}
        {...rest}
      >
        {title && <title>{title}</title>}
        {paths.map((d, i) => <path key={i} d={d} />)}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

const MAP = {
  Activity: faWaveSquare, AlertCircle: faCircleExclamation, AlertTriangle: faTriangleExclamation,
  ArrowLeft: faArrowLeft, ArrowRight: faArrowRight, ArrowUpRight: faArrowUpRightFromSquare,
  BadgeCheck: faCircleCheck, BadgePercent: faPercent, Banknote: faMoneyBillWave, BarChart3: faChartColumn,
  Bath: faBath, BedDouble: faBed, Bell: faBell, BellRing: faBell, Briefcase: faBriefcase,
  Building: faBuilding, Building2: faBuilding, Calculator: faCalculator, Calendar: faCalendar,
  CalendarCheck: faCalendarCheck, CalendarDays: faCalendarDays, CalendarRange: faCalendarWeek, Car: faCar,
  ChartNoAxesColumn: faChartColumn, Check: faCheck, CheckCircle: faCircleCheck, CheckCircle2: faCircleCheck,
  CheckIcon: faCheck, ChevronDown: faChevronDown, ChevronDownIcon: faChevronDown, ChevronLeft: faChevronLeft,
  ChevronRight: faChevronRight, ChevronRightIcon: faChevronRight, ChevronUp: faChevronUp, ChevronUpIcon: faChevronUp,
  CircleAlert: faCircleExclamation, CircleCheckIcon: faCircleCheck, CircleDot: faCircleDot,
  ClipboardList: faClipboardList, Clock: faClock, Clock3: faClock, Coins: faCoins, Contact: faAddressBook,
  Copy: faCopy, CreditCard: faCreditCard, Crown: faCrown, DollarSign: faDollarSign, Download: faDownload,
  ExternalLink: faArrowUpRightFromSquare, Eye: faEye, EyeOff: faEyeSlash, FileBarChart: faFileInvoiceDollar,
  FileBarChart2: faChartColumn, FileCheck2: faFileCircleCheck, FileClock: faFileCircleQuestion,
  FileSearch: faMagnifyingGlass, FileSignature: faFileSignature, FileText: faFileLines, FileX: faFileCircleXmark,
  Filter: faFilter, Fingerprint: faFingerprint, FolderOpen: faFolderOpen, Funnel: faFilter, Gauge: faGaugeHigh,
  Gavel: faGavel, Gift: faGift, Globe: faGlobe, GripVertical: faGripVertical, Hammer: faHammer,
  HandCoins: faHandHoldingDollar, Handshake: faHandshake, Heart: faHeart, Home: faHouse, House: faHouse,
  IdCard: faIdCard, Image: faImage, ImageOff: faImage, ImagePlus: faImages, Inbox: faInbox, Info: faCircleInfo,
  InfoIcon: faCircleInfo, KeyRound: faKey, Landmark: faLandmark, Layers: faLayerGroup, LayoutGrid: faTableCells,
  Lightbulb: faLightbulb, Loader2: faSpinner, Loader2Icon: faSpinner, Lock: faLock, LogOut: faRightFromBracket,
  Mail: faEnvelope, MapPin: faLocationDot, MapPinned: faMapLocationDot, Maximize: faExpand, Megaphone: faBullhorn,
  Menu: faBars, MessageCircle: faComment, MessageSquare: faMessage, MoreVertical: faEllipsisVertical,
  OctagonXIcon: faCircleXmark, PanelLeft: faTableColumns, PanelLeftClose: faTableColumns, Paperclip: faPaperclip,
  Pencil: faPen, Percent: faPercent, Phone: faPhone, Plus: faPlus, Printer: faPrint, QrCode: faQrcode,
  Radio: faTowerBroadcast, Receipt: faReceipt, RefreshCw: faRotate, RotateCcw: faRotateLeft, Rows3: faTableList,
  Save: faFloppyDisk, Scale: faScaleBalanced, Search: faMagnifyingGlass, SearchX: faMagnifyingGlass,
  Send: faPaperPlane, Settings: faGear, Settings2: faGears, ShieldAlert: faShieldHalved, ShieldCheck: faShieldHalved,
  Signpost: faSignsPost, SlidersHorizontal: faSliders, Sparkles: faWandMagicSparkles, Star: faStar,
  StickyNote: faNoteSticky, Store: faStore, Table2: faTable, Tag: faTag, Target: faBullseye, Trash2: faTrash,
  TrendingDown: faArrowTrendDown, TrendingUp: faArrowTrendUp, TriangleAlertIcon: faTriangleExclamation,
  Trophy: faTrophy, Upload: faUpload, User: faUser, UserCheck: faUserCheck, UserCog: faUserGear,
  UserRound: faUserLarge, Users: faUsers, UserSquare: faUserTie, UsersRound: faUsers, Wallet: faWallet,
  Workflow: faDiagramProject, Wrench: faWrench, X: faXmark, XCircle: faCircleXmark, XIcon: faXmark, Zap: faBolt,
  // glifos de módulo nomeados pelo design system
  ChartLine: faChartLine, SquareCheck: faSquareCheck, Contrast: faCircleHalfStroke,
  LogIn: faRightToBracket, Pause: faPause, Play: faPlay, Folder: faFolderOpen2,
};

const I = Object.fromEntries(Object.entries(MAP).map(([n, d]) => [n, make(d, n)]));

export const {
  Activity, AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, BadgePercent,
  Banknote, BarChart3, Bath, BedDouble, Bell, BellRing, Briefcase, Building, Building2, Calculator,
  Calendar, CalendarCheck, CalendarDays, CalendarRange, Car, ChartNoAxesColumn, Check, CheckCircle,
  CheckCircle2, CheckIcon, ChevronDown, ChevronDownIcon, ChevronLeft, ChevronRight, ChevronRightIcon,
  ChevronUp, ChevronUpIcon, CircleAlert, CircleCheckIcon, CircleDot, ClipboardList, Clock, Clock3, Coins,
  Contact, Copy, CreditCard, Crown, DollarSign, Download, ExternalLink, Eye, EyeOff, FileBarChart,
  FileBarChart2, FileCheck2, FileClock, FileSearch, FileSignature, FileText, FileX, Filter, Fingerprint,
  FolderOpen, Funnel, Gauge, Gavel, Gift, Globe, GripVertical, Hammer, HandCoins, Handshake, Heart, Home,
  House, IdCard, Image, ImageOff, ImagePlus, Inbox, Info, InfoIcon, KeyRound, Landmark, Layers, LayoutGrid,
  Lightbulb, Loader2, Loader2Icon, Lock, LogOut, Mail, MapPin, MapPinned, Maximize, Megaphone, Menu,
  MessageCircle, MessageSquare, MoreVertical, OctagonXIcon, PanelLeft, PanelLeftClose, Paperclip, Pencil,
  Percent, Phone, Plus, Printer, QrCode, Radio, Receipt, RefreshCw, RotateCcw, Rows3, Save, Scale, Search,
  SearchX, Send, Settings, Settings2, ShieldAlert, ShieldCheck, Signpost, SlidersHorizontal, Sparkles, Star,
  StickyNote, Store, Table2, Tag, Target, Trash2, TrendingDown, TrendingUp, TriangleAlertIcon, Trophy,
  Upload, User, UserCheck, UserCog, UserRound, Users, UserSquare, UsersRound, Wallet, Workflow, Wrench, X,
  XCircle, XIcon, Zap, ChartLine, SquareCheck, Contrast, LogIn, Pause, Play, Folder,
} = I;
