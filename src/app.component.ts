import { Component, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TimeEntry {
  type: 'in' | 'out';
  time: Date;
}

type ActiveView = 'hoy' | 'calendario' | 'resumen' | 'perfil';
type SummaryView = 'semanal' | 'mensual';

interface CalendarDay {
  dayOfMonth: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class AppComponent implements OnInit, OnDestroy {
  
  // State Signals
  currentTime: WritableSignal<Date> = signal(new Date());
  timeEntries: WritableSignal<TimeEntry[]> = signal([]);
  activeView = signal<ActiveView>('hoy');
  summaryView = signal<SummaryView>('semanal');

  // Mock data for summary
  weeklyHours = signal([
    { day: 'L', hours: 8 }, { day: 'M', hours: 7.5 }, { day: 'X', hours: 8.2 },
    { day: 'J', hours: 6 }, { day: 'V', hours: 8 }, { day: 'S', hours: 0 },
    { day: 'D', hours: 0 }
  ]);
  
  // Calendar state
  calendarDate = signal(new Date());
  calendarDays = computed<CalendarDay[]>(() => this.generateCalendarDays(this.calendarDate()));
  calendarMonthYear = computed(() => this.calendarDate().toLocaleString('es-ES', { month: 'long', year: 'numeric' }));


  // Computed Signals
  clockedIn = computed(() => {
    const lastEntry = this.timeEntries().slice(-1)[0];
    return lastEntry ? lastEntry.type === 'in' : false;
  });

  workedMilliseconds = computed(() => {
    let totalMs = 0;
    const entries = this.timeEntries();
    
    for (let i = 0; i < entries.length; i += 2) {
      const inEntry = entries[i];
      const outEntry = entries[i + 1];
      
      if (inEntry && inEntry.type === 'in') {
        const endTime = outEntry ? outEntry.time.getTime() : this.currentTime().getTime();
        totalMs += endTime - inEntry.time.getTime();
      }
    }
    return totalMs;
  });

  formattedWorkedTime = computed(() => {
    const totalSeconds = Math.floor(this.workedMilliseconds() / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${this.pad(hours)}h ${this.pad(minutes)}m ${this.pad(seconds)}s`;
  });

  private timerId: any;

  ngOnInit() {
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  handleClockInOut(): void {
    const newEntry: TimeEntry = {
      type: this.clockedIn() ? 'out' : 'in',
      time: new Date()
    };
    this.timeEntries.update(entries => [...entries, newEntry]);
  }

  changeView(view: ActiveView): void {
    this.activeView.set(view);
  }

  changeSummaryView(view: SummaryView): void {
    this.summaryView.set(view);
  }
  
  pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  formatTime(date: Date): string {
    return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`;
  }

  private generateCalendarDays(date: Date): CalendarDay[] {
    const today = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // 0=Monday, 6=Sunday

    const days: CalendarDay[] = [];

    // Add blank days for the previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ dayOfMonth: null, isCurrentMonth: false, isToday: false });
    }

    // Add days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      days.push({ dayOfMonth: i, isCurrentMonth: true, isToday: isToday });
    }
    
    return days;
  }
}