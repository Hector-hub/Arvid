import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusic, type Music } from './MusicProvider';
import { TrackName } from './TrackName';

vi.mock('./MusicProvider', () => ({ useMusic: vi.fn() }));

const track = { id: 'black-chrome-horizon', name: 'Black Chrome Horizon', src: '/music/black-chrome-horizon.m4a' };
const music = (patch: Partial<Music>) => vi.mocked(useMusic).mockReturnValue({ playing: true, needsConnection: false, ...patch } as Music);

let animate: ReturnType<typeof vi.fn>;
const started: { currentTime: number }[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(100_000);
  started.length = 0;
  animate = vi.fn(() => {
    const anim = { currentTime: 0, cancel: vi.fn() };
    started.push(anim);
    return anim;
  });
  HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate'];
});

afterEach(() => {
  vi.useRealTimers();
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

describe('nombre de la pista (MUS-08)', () => {
  it('al empezar una pista se muestra su nombre durante 5 s y luego se desvanece', () => {
    music({ track, startedAt: 100_000 });
    render(<TrackName />);
    expect(screen.getByText('♪ Black Chrome Horizon')).toBeInTheDocument();
    const [keyframes, options] = animate.mock.calls[0]!;
    expect(options).toMatchObject({ duration: 5_800, fill: 'forwards' });
    expect(keyframes.at(-1)).toMatchObject({ opacity: 0 });
    expect(started[0]!.currentTime).toBe(0);
  });

  it('al volver a montar la escena, sigue donde iba y no reaparece pasados los 5 s', () => {
    music({ track, startedAt: 100_000 - 2_000 });
    const { unmount } = render(<TrackName />);
    expect(started[0]!.currentTime).toBe(2_000);
    unmount();
    music({ track, startedAt: 100_000 - 10_000 });
    render(<TrackName />);
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('sin pista no muestra nada', () => {
    music({});
    const { container } = render(<TrackName />);
    expect(container).toBeEmptyDOMElement();
  });
});
