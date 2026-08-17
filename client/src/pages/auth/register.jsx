import {
  Link,
} from 'react-router-dom';

import {
  ArrowLeft,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import Button from '../../components/ui/Button.jsx';

const Register = () => {
  return (
    <div className="w-full">

      <div className="mb-8">

        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.16em]
            text-blue-600
            dark:text-blue-400
          "
        >
          Hesap Yönetimi
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-semibold
            tracking-[-0.035em]
            text-gray-900
            dark:text-white
            sm:text-[28px]
          "
        >
          Yeni kullanıcı kaydı yönetici tarafından yapılır
        </h2>

        <p
          className="
            mt-3
            text-sm
            leading-6
            text-gray-500
            dark:text-slate-400
          "
        >
          Derkenar çalışma alanlarında kullanıcı hesapları
          büro yöneticisi tarafından oluşturulur ve yetkilendirilir.
        </p>

      </div>

      <div
        className="
          rounded-2xl
          border
          border-gray-200
          bg-gray-50/70
          p-5
          dark:border-white/[0.07]
          dark:bg-white/[0.025]
        "
      >

        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            bg-blue-50
            text-blue-600
            dark:bg-blue-500/[0.08]
            dark:text-blue-400
          "
        >
          <UserPlus size={20} />
        </div>

        <h3
          className="
            mt-4
            text-sm
            font-semibold
            text-gray-900
            dark:text-white
          "
        >
          Ekibinize kullanıcı eklemek mi istiyorsunuz?
        </h3>

        <p
          className="
            mt-1.5
            text-sm
            leading-6
            text-gray-500
            dark:text-slate-400
          "
        >
          Yönetici hesabıyla giriş yaptıktan sonra
          Kullanıcılar bölümünden avukat, stajyer veya
          sekreter hesabı oluşturabilirsiniz.
        </p>

      </div>

      <div
        className="
          mt-5
          flex
          items-start
          gap-3
          rounded-xl
          border
          border-emerald-200/70
          bg-emerald-50/60
          p-4
          dark:border-emerald-500/15
          dark:bg-emerald-500/[0.04]
        "
      >
        <ShieldCheck
          size={18}
          className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
        />

        <p
          className="
            text-xs
            leading-5
            text-emerald-800
            dark:text-emerald-300
          "
        >
          Bu yapı, kullanıcı rollerinin ve büro verilerine
          erişim yetkilerinin kontrollü şekilde yönetilmesini sağlar.
        </p>

      </div>

      <Link
        to="/login"
        className="mt-7 block"
      >
        <Button
          variant="secondary"
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Giriş Ekranına Dön
        </Button>
      </Link>

    </div>
  );
};

export default Register;