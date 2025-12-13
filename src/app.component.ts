import { Component, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy, WritableSignal, ViewChild, ElementRef, effect, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

// Declare globals provided by CDN scripts
declare var FullCalendar: any;
declare var echarts: any;

interface TimeEntry {
  type: 'in' | 'out';
  time: Date;
}

type ActiveView = 'hoy' | 'calendario' | 'resumen' | 'perfil';
type SummaryView = 'semanal' | 'mensual';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Allow Ionic Web Components
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('calendarContainer') calendarEl!: ElementRef;
  private calendar: any;

  @ViewChild('chartContainer') chartEl!: ElementRef;
  private chart: any;
  
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

  constructor() {
    effect(() => {
      if (this.activeView() === 'calendario') {
        setTimeout(() => this.renderCalendar(), 0);
      } else if (this.calendar) {
        this.calendar.destroy();
        this.calendar = null;
      }
    });

    effect(() => {
      if (this.activeView() === 'resumen' && this.summaryView() === 'semanal') {
        setTimeout(() => this.renderChart(), 0);
      } else if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }
    });
  }

  ngOnInit() {
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    if (this.chart) {
      this.chart.resize();
    }
  }

  renderCalendar(): void {
    if (this.calendarEl && !this.calendar) {
      this.calendar = new FullCalendar.Calendar(this.calendarEl.nativeElement, {
        initialView: 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next',
          center: 'title',
          right: 'today'
        },
        locale: 'es',
        buttonText: {
          today: 'Hoy'
        }
      });
      this.calendar.render();
    }
  }

  renderChart(): void {
    if (this.chartEl && !this.chart) {
      this.chart = echarts.init(this.chartEl.nativeElement);
      const option = {
        tooltip: {
          trigger: 'axis'
        },
        xAxis: {
          type: 'category',
          data: this.weeklyHours().map(d => d.day),
          axisLine: { lineStyle: { color: '#888' } }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: '#444' } },
          axisLine: { lineStyle: { color: '#888' } }
        },
        series: [{
          name: 'Horas',
          type: 'bar',
          data: this.weeklyHours().map(d => d.hours),
          itemStyle: {
            color: '#22d3ee', // Tailwind's cyan-400
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
                color: '#67e8f9' // Tailwind's cyan-300
            }
          }
        }],
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        backgroundColor: 'transparent'
      };
      this.chart.setOption(option);
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

  changeSummaryView(event: any): void {
    this.summaryView.set(event.detail.value);
  }
  
  pad(num: number): string {
    return num.toString().padStart(2, '0');
  }

  formatTime(date: Date): string {
    return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`;
  }
}