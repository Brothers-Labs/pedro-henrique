import { Pipe, PipeTransform } from '@angular/core';

import { formatFileSize } from '../../core/utils/format';

@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    return formatFileSize(bytes);
  }
}
