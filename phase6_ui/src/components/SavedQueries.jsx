import { Bookmark, ArrowUpRight, Trash2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import SourceCard from './SourceCard';

export default function SavedQueries({ queries = [], onQuerySelect, onRemoveQuery }) {
  if (!queries || queries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground mb-4">
          <Bookmark className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No Saved Queries Yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Click the Save button beneath any AI response in the Chat Assistant to bookmark it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary" />
            Saved Queries
          </h3>
          <p className="text-sm text-muted-foreground">
            Bookmarked answers and sources from your RAG sessions.
          </p>
        </div>

        <div className="space-y-3">
          {queries.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.query}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onQuerySelect(item.query)}
                    >
                      Re-ask
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                    {onRemoveQuery && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveQuery(item.id)}
                        title="Remove saved query"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {item.result?.answer}
                </p>

                {item.result?.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                    {item.result.sources.map((url, idx) => (
                      <SourceCard key={idx} url={url} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
