package io.resys.thena.tasks.client.spi.visitors;

import java.util.Arrays;
import java.util.List;

import io.resys.thena.docdb.api.actions.HistoryActions.BlobHistoryQuery;
import io.resys.thena.docdb.api.actions.PullActions.MatchCriteria;
import io.resys.thena.docdb.api.models.QueryEnvelope;
import io.resys.thena.docdb.api.models.QueryEnvelope.QueryEnvelopeStatus;
import io.resys.thena.docdb.api.models.ThenaObject.BlobHistory;
import io.resys.thena.docdb.api.models.ThenaObjects.HistoryObjects;
import io.resys.thena.tasks.client.api.model.Document;
import io.resys.thena.tasks.client.api.model.ImmutableTask;
import io.resys.thena.tasks.client.api.model.ImmutableTaskHistory;
import io.resys.thena.tasks.client.api.model.Task.TaskHistory;
import io.resys.thena.tasks.client.spi.store.DocumentConfig;
import io.resys.thena.tasks.client.spi.store.DocumentConfig.DocHistoryVisitor;
import io.resys.thena.tasks.client.spi.store.DocumentStoreException;
import io.vertx.core.json.JsonObject;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class GetTaskHistoryVisitor implements DocHistoryVisitor<TaskHistory> {
  private final String taskId;
  
  @Override
  public BlobHistoryQuery start(DocumentConfig config, BlobHistoryQuery builder) {
     builder.latestOnly(false).matchBy(
      MatchCriteria.equalsTo("documentType", Document.DocumentType.TASK.name()),
      MatchCriteria.equalsTo("id", taskId)
    );
     
     return builder;
  }

  @Override
  public HistoryObjects visitEnvelope(DocumentConfig config, QueryEnvelope<HistoryObjects> envelope) {
    if(envelope.getStatus() != QueryEnvelopeStatus.OK) {
      throw DocumentStoreException.builder("FIND_TASK_HISTORY_FAIL").add(config, envelope)
      .add(c -> c.addArgs(JsonObject.of(
          "taskId", taskId
          ).encode()))
      .build();
    }
    if(envelope.getObjects().getValues().isEmpty()) {
      throw DocumentStoreException.builder("NO_TASK_HISTORY_TO_FIND").add(config, envelope)
      .add(c -> c.addArgs(JsonObject.of(
          "taskId", taskId
          ).encode()))
      .build();
    }
    return envelope.getObjects();
  }

  @Override
  public List<TaskHistory> end(DocumentConfig config, HistoryObjects values) {
    BlobHistory previous = null;
    ImmutableTaskHistory.Builder historyBuilder = ImmutableTaskHistory.builder();
    for(final var history : values.getValues()) {
      if(previous != null && previous.getBlob().equals(history.getBlob())) {
        previous = history;
        continue;
      }

      historyBuilder.addVersions(history.getBlob().getValue().mapTo(ImmutableTask.class));
      previous = history;
    }

    return Arrays.asList(historyBuilder.id("not implemented yet").build());
  }
}
  
