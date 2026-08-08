import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  GuestbookService,
  MAX_AUTHOR_LENGTH,
  MAX_MESSAGE_LENGTH,
} from '../../../../core/services/guestbook.service';
import { SectionHeading } from '../../../../shared/components/section-heading/section-heading';

const AVAILABLE_EMOJIS = ['🎉', '💛', '🚀', '🦖', '⚽', '🎨', '🌈', '⭐'] as const;

@Component({
  selector: 'app-guestbook-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, SectionHeading],
  templateUrl: './guestbook-section.html',
  styleUrl: './guestbook-section.scss',
})
export class GuestbookSection {
  private readonly guestbook = inject(GuestbookService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly maxMessageLength = MAX_MESSAGE_LENGTH;
  protected readonly emojis = AVAILABLE_EMOJIS;
  protected readonly messages = this.guestbook.messages;
  protected readonly selectedEmoji = signal<string>(AVAILABLE_EMOJIS[0]);
  protected readonly confirmation = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    author: ['', [Validators.required, Validators.maxLength(MAX_AUTHOR_LENGTH)]],
    message: ['', [Validators.required, Validators.maxLength(MAX_MESSAGE_LENGTH)]],
  });

  private readonly messageValue = toSignal(this.form.controls.message.valueChanges, {
    initialValue: '',
  });
  protected readonly remainingCharacters = computed(
    () => MAX_MESSAGE_LENGTH - this.messageValue().length,
  );

  protected selectEmoji(emoji: string): void {
    this.selectedEmoji.set(emoji);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { author, message } = this.form.getRawValue();
    this.guestbook.add({ author, message, emoji: this.selectedEmoji() });

    this.form.reset();
    this.confirmation.set('Recado enviado! Obrigado por escrever.');
  }

  protected remove(id: string): void {
    this.guestbook.remove(id);
    this.confirmation.set('Recado apagado.');
  }

  protected hasError(controlName: 'author' | 'message'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }
}
