import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Paperclip,
  Send,
} from 'lucide-react';

const MAX_MESSAGE_LENGTH =
  10_000;

const MessageInput = ({
  disabled,
  sending,
  onSend,
  onTyping,
  attachmentsEnabled = false,
}) => {
  const [
    value,
    setValue,
  ] =
    useState('');

  const typingTimerRef =
    useRef(null);

  useEffect(
    () => () => {
      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      onTyping?.(
        false
      );
    },
    [
      onTyping,
    ]
  );

  const stopTypingLater =
    () => {
      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      typingTimerRef.current =
        setTimeout(
          () => {
            onTyping?.(
              false
            );
          },
          1200
        );
    };

  const handleChange =
    (
      event
    ) => {
      const nextValue =
        event.target.value;

      if (
        nextValue.length >
        MAX_MESSAGE_LENGTH
      ) {
        return;
      }

      setValue(
        nextValue
      );

      onTyping?.(
        Boolean(
          nextValue.trim()
        )
      );

      stopTypingLater();
    };

  const submit =
    async () => {
      const content =
        value.trim();

      if (
        !content ||
        disabled ||
        sending
      ) {
        return;
      }

      setValue('');

      if (
        typingTimerRef.current
      ) {
        clearTimeout(
          typingTimerRef.current
        );
      }

      onTyping?.(
        false
      );

      try {
        await onSend(
          content
        );
      } catch {
        /*
         * Mutation kendi toast/error akışını yönetiyor.
         * Kullanıcı metni kaybetmesin.
         */
        setValue(
          content
        );
      }
    };

  const handleKeyDown =
    (
      event
    ) => {
      if (
        event.key ===
          'Enter' &&
        !event.shiftKey
      ) {
        event.preventDefault();

        void submit();
      }
    };

  return (
    <div className="border-t border-gray-200 bg-white p-3 dark:border-white/[0.06] dark:bg-[#0b1b33]">
      <div className="flex items-end gap-2">
        <button
          type="button"
          disabled={
            !attachmentsEnabled
          }
          className="
            inline-flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-xl border border-gray-200
            text-gray-400 transition
            hover:bg-gray-50
            disabled:cursor-not-allowed
            disabled:opacity-40
            dark:border-white/[0.07]
            dark:text-slate-500
            dark:hover:bg-white/[0.05]
          "
          aria-label="Dosya ekle"
          title={
            attachmentsEnabled
              ? 'Dosya ekle'
              : 'Dosya gönderimi storage bağlandıktan sonra açılacak'
          }
        >
          <Paperclip
            size={18}
          />
        </button>

        <div className="min-w-0 flex-1">
          <textarea
            value={
              value
            }
            onChange={
              handleChange
            }
            onKeyDown={
              handleKeyDown
            }
            disabled={
              disabled
            }
            rows={1}
            placeholder="Mesaj yaz..."
            className="
              max-h-32 min-h-10 w-full
              resize-none rounded-xl
              border border-gray-200
              bg-gray-50 px-3 py-2.5
              text-sm leading-5
              text-gray-900 outline-none
              transition
              placeholder:text-gray-400
              focus:border-amber-300
              focus:bg-white
              focus:ring-2
              focus:ring-amber-100
              disabled:cursor-not-allowed
              disabled:opacity-60
              dark:border-white/[0.07]
              dark:bg-white/[0.035]
              dark:text-white
              dark:placeholder:text-slate-500
              dark:focus:border-amber-400/30
              dark:focus:ring-amber-500/10
            "
          />

          <div className="mt-1 flex justify-end">
            <span className="text-[9px] font-medium text-gray-300 dark:text-slate-700">
              {value.length}/
              {MAX_MESSAGE_LENGTH}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void submit()
          }
          disabled={
            disabled ||
            sending ||
            !value.trim()
          }
          className="
            inline-flex h-10 w-10 shrink-0
            items-center justify-center
            rounded-xl bg-blue-600
            text-white transition
            hover:bg-blue-500
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
          aria-label="Mesaj gönder"
        >
          <Send
            size={17}
          />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
